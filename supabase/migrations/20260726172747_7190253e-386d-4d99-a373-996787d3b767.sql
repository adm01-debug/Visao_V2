-- Onda 117 — Escalonamento por tempo de vida de alertas de manutenção.
-- Política canônica: src/lib/maintenanceEscalation.ts (o gate db:check:escalation
-- compara as decisões desta rotina com as da lib e falha em qualquer divergência).

ALTER TABLE public.maintenance_alert_events
  ADD COLUMN IF NOT EXISTS acknowledged_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by   UUID,
  ADD COLUMN IF NOT EXISTS escalation_level  SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMPTZ;

ALTER TABLE public.maintenance_alert_events
  DROP CONSTRAINT IF EXISTS maintenance_alert_events_level_check;
ALTER TABLE public.maintenance_alert_events
  ADD CONSTRAINT maintenance_alert_events_level_check
  CHECK (escalation_level BETWEEN 0 AND 3);

-- Alertas abertos são a fila de trabalho da rotina: índice parcial mantém a
-- varredura barata mesmo com 90 dias de histórico reconhecido na tabela.
CREATE INDEX IF NOT EXISTS maintenance_alert_events_open_idx
  ON public.maintenance_alert_events (severity, created_at)
  WHERE acknowledged_at IS NULL;

CREATE TABLE IF NOT EXISTS public.maintenance_alert_escalations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id     UUID NOT NULL REFERENCES public.maintenance_alert_events(id) ON DELETE CASCADE,
  from_level   SMALLINT NOT NULL CHECK (from_level BETWEEN 0 AND 3),
  to_level     SMALLINT NOT NULL CHECK (to_level BETWEEN 0 AND 3),
  age_minutes  NUMERIC NOT NULL CHECK (age_minutes >= 0),
  reason       TEXT NOT NULL,
  emitted_alert BOOLEAN NOT NULL DEFAULT false,
  detail       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Um alerta só pode ocupar cada degrau uma única vez: barreira final contra
  -- execuções concorrentes do cron gerarem repique duplicado no mesmo nível.
  CONSTRAINT maintenance_alert_escalations_step_key UNIQUE (alert_id, to_level),
  CONSTRAINT maintenance_alert_escalations_forward CHECK (to_level > from_level)
);

GRANT SELECT ON public.maintenance_alert_escalations TO authenticated;
GRANT ALL    ON public.maintenance_alert_escalations TO service_role;
REVOKE ALL   ON public.maintenance_alert_escalations FROM anon;

ALTER TABLE public.maintenance_alert_escalations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem ver escalonamentos" ON public.maintenance_alert_escalations;
CREATE POLICY "Admins podem ver escalonamentos"
  ON public.maintenance_alert_escalations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS set_maintenance_alert_escalations_updated_at ON public.maintenance_alert_escalations;
CREATE TRIGGER set_maintenance_alert_escalations_updated_at
  BEFORE UPDATE ON public.maintenance_alert_escalations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS maintenance_alert_escalations_recent_idx
  ON public.maintenance_alert_escalations (created_at DESC);

-- ---------------------------------------------------------------------------
-- Reconhecimento: congela a escada. Exige admin autenticado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acknowledge_maintenance_alert(_alert_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_when TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'apenas administradores podem reconhecer alertas de manutencao';
  END IF;

  -- Idempotente: reconhecer duas vezes preserva o primeiro dono e o primeiro
  -- carimbo — a métrica de tempo até reconhecimento não pode ser reescrita.
  UPDATE public.maintenance_alert_events
     SET acknowledged_at = COALESCE(acknowledged_at, now()),
         acknowledged_by = COALESCE(acknowledged_by, auth.uid())
   WHERE id = _alert_id
  RETURNING acknowledged_at INTO v_when;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'alerta % nao encontrado', _alert_id;
  END IF;

  RETURN v_when;
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_maintenance_alert(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_maintenance_alert(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Rotina de escalonamento. Sobe no máximo UM degrau por alerta por execução.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.escalate_stale_maintenance_alerts()
RETURNS TABLE (alert_id UUID, from_level SMALLINT, to_level SMALLINT, age_minutes NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r              RECORD;
  v_age          NUMERIC;
  v_target       SMALLINT;
  v_next         SMALLINT;
  v_ceiling      SMALLINT;
  v_required     NUMERIC;
  v_delivered    BOOLEAN;
  v_since_step   NUMERIC;
  c_min_step     CONSTANT NUMERIC := 30;   -- minStepMinutes
  c_undeliv_grace CONSTANT NUMERIC := 75;  -- undeliveredGraceMinutes
BEGIN
  -- Trava de execução: duas instâncias do cron sobrepostas escalariam o mesmo
  -- alerta duas vezes antes de o UNIQUE(alert_id,to_level) barrar, gerando erro.
  IF NOT pg_try_advisory_lock(hashtext('escalate_stale_maintenance_alerts')) THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT e.id,
           e.routine,
           e.severity,
           e.created_at,
           e.escalation_level,
           e.last_escalated_at,
           EXISTS (
             SELECT 1 FROM public.maintenance_alert_dispatches d
              WHERE d.alert_id = e.id AND d.status = 'sent'
           ) AS delivered
      FROM public.maintenance_alert_events e
     WHERE e.acknowledged_at IS NULL
       AND e.created_at > now() - INTERVAL '30 days'
       AND e.escalation_level < CASE WHEN e.severity = 'critical' THEN 3 ELSE 2 END
     ORDER BY e.created_at
     FOR UPDATE OF e SKIP LOCKED
  LOOP
    -- Idade negativa (relógio recuado) vira 0 e nunca escala — I8 da lib.
    v_age := GREATEST(0, EXTRACT(EPOCH FROM (now() - r.created_at)) / 60.0);
    v_delivered := r.delivered;
    v_ceiling := CASE WHEN r.severity = 'critical' THEN 3 ELSE 2 END;

    -- Nível justificado pela idade (espelha targetLevelForAge).
    v_target := 0;
    FOR i IN 1..v_ceiling LOOP
      v_required := CASE
        WHEN r.severity = 'critical' THEN (ARRAY[NULL, 30, 120, 360]::NUMERIC[])[i + 1]
        ELSE (ARRAY[NULL, 240, 1440, NULL]::NUMERIC[])[i + 1]
      END;
      IF v_required IS NULL THEN EXIT; END IF;
      IF NOT v_delivered AND i = 1 THEN
        v_required := LEAST(v_required, c_undeliv_grace);
      END IF;
      IF v_age >= v_required THEN v_target := i::SMALLINT; ELSE EXIT; END IF;
    END LOOP;

    IF v_target <= r.escalation_level THEN CONTINUE; END IF;

    v_since_step := CASE
      WHEN r.last_escalated_at IS NULL THEN NULL
      ELSE EXTRACT(EPOCH FROM (now() - r.last_escalated_at)) / 60.0
    END;
    IF v_since_step IS NOT NULL AND v_since_step < c_min_step THEN CONTINUE; END IF;

    v_next := LEAST(r.escalation_level + 1, v_target, v_ceiling)::SMALLINT;
    IF v_next <= r.escalation_level THEN CONTINUE; END IF;

    UPDATE public.maintenance_alert_events
       SET escalation_level = v_next,
           last_escalated_at = now()
     WHERE id = r.id;

    INSERT INTO public.maintenance_alert_escalations
      (alert_id, from_level, to_level, age_minutes, reason, emitted_alert, detail)
    VALUES (
      r.id, r.escalation_level, v_next, ROUND(v_age, 1),
      format('%s min sem reconhecimento; %s', ROUND(v_age, 1),
             CASE WHEN v_delivered THEN 'notificacao entregue' ELSE 'sem entrega confirmada' END),
      v_next >= 2,
      jsonb_build_object('routine', r.routine, 'severity', r.severity, 'delivered', v_delivered)
    )
    ON CONFLICT (alert_id, to_level) DO NOTHING;

    -- A partir do nível 2 o incidente vira fato novo no barramento: o
    -- despachante da Onda 111 o trata como alerta comum e reenvia aos canais.
    IF v_next >= 2 THEN
      INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
      VALUES (
        'maintenance_escalation',
        'critical',
        format('Alerta de %s sem reconhecimento ha %s min — nivel %s',
               r.routine, ROUND(v_age, 1), v_next),
        jsonb_build_object(
          'source_alert_id', r.id,
          'source_routine', r.routine,
          'source_severity', r.severity,
          'level', v_next,
          'age_minutes', ROUND(v_age, 1)
        ),
        now()
      );
    END IF;

    alert_id := r.id;
    from_level := r.escalation_level;
    to_level := v_next;
    age_minutes := ROUND(v_age, 1);
    RETURN NEXT;
  END LOOP;

  PERFORM pg_advisory_unlock(hashtext('escalate_stale_maintenance_alerts'));
END;
$$;

REVOKE ALL ON FUNCTION public.escalate_stale_maintenance_alerts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_stale_maintenance_alerts() TO service_role;