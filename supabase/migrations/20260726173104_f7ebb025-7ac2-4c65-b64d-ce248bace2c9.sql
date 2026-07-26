-- Correção: os parâmetros OUT (alert_id, from_level, to_level) colidiam com as
-- colunas homônimas de maintenance_alert_escalations no ON CONFLICT, abortando
-- a rotina. Renomeados para nomes sem ambiguidade.
DROP FUNCTION IF EXISTS public.escalate_stale_maintenance_alerts();

CREATE OR REPLACE FUNCTION public.escalate_stale_maintenance_alerts()
RETURNS TABLE (escalated_alert_id UUID, previous_level SMALLINT, new_level SMALLINT, age_min NUMERIC)
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
       AND e.routine <> 'maintenance_escalation'
       AND e.created_at > now() - INTERVAL '30 days'
       AND e.escalation_level < CASE WHEN e.severity = 'critical' THEN 3 ELSE 2 END
     ORDER BY e.created_at
     FOR UPDATE OF e SKIP LOCKED
  LOOP
    v_age := GREATEST(0, EXTRACT(EPOCH FROM (now() - r.created_at)) / 60.0);
    v_delivered := r.delivered;
    v_ceiling := CASE WHEN r.severity = 'critical' THEN 3 ELSE 2 END;

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

    INSERT INTO public.maintenance_alert_escalations AS mae
      (alert_id, from_level, to_level, age_minutes, reason, emitted_alert, detail)
    VALUES (
      r.id, r.escalation_level, v_next, ROUND(v_age, 1),
      format('%s min sem reconhecimento; %s', ROUND(v_age, 1),
             CASE WHEN v_delivered THEN 'notificacao entregue' ELSE 'sem entrega confirmada' END),
      v_next >= 2,
      jsonb_build_object('routine', r.routine, 'severity', r.severity, 'delivered', v_delivered)
    )
    ON CONFLICT ON CONSTRAINT maintenance_alert_escalations_step_key DO NOTHING;

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

    escalated_alert_id := r.id;
    previous_level := r.escalation_level;
    new_level := v_next;
    age_min := ROUND(v_age, 1);
    RETURN NEXT;
  END LOOP;

  PERFORM pg_advisory_unlock(hashtext('escalate_stale_maintenance_alerts'));
END;
$$;

REVOKE ALL ON FUNCTION public.escalate_stale_maintenance_alerts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_stale_maintenance_alerts() TO service_role;