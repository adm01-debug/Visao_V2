-- ============================================================
-- Onda 110 — Alertas críticos de manutenção do banco
-- ============================================================

CREATE TABLE IF NOT EXISTS public.maintenance_alert_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine       text NOT NULL,
  severity      text NOT NULL CHECK (severity IN ('warning', 'critical')),
  reason        text NOT NULL,
  detail        jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.maintenance_alert_events TO authenticated;
GRANT ALL    ON public.maintenance_alert_events TO service_role;

ALTER TABLE public.maintenance_alert_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem ver alertas de manutencao" ON public.maintenance_alert_events;
CREATE POLICY "Admins podem ver alertas de manutencao"
  ON public.maintenance_alert_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS maintenance_alert_events_recent_idx
  ON public.maintenance_alert_events (routine, severity, created_at DESC);

DROP TRIGGER IF EXISTS set_maintenance_alert_events_updated_at ON public.maintenance_alert_events;
CREATE TRIGGER set_maintenance_alert_events_updated_at
  BEFORE UPDATE ON public.maintenance_alert_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- Avaliador (READ-ONLY sobre as telemetrias — G3 da simulação)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_maintenance_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  stale_hours    constant int := 48;
  cooldown_hours constant int := 6;
  backlog_max    constant int := 10000;

  rec            record;
  severity       text;
  reason         text;
  age_hours      numeric;
  emitted        int := 0;
  suppressed     int := 0;
  results        jsonb := '[]'::jsonb;
BEGIN
  -- G6: o avaliador roda de hora em hora; nunca pode segurar o pool.
  PERFORM set_config('statement_timeout', '20s', true);

  FOR rec IN
    -- Situação mais recente de cada rotina monitorada.
    SELECT 'partition_maintenance'::text AS routine, x.ran_at, x.ok,
           false AS locked_out, 0::bigint AS backlog, x.error_detail
    FROM (SELECT ran_at, ok, error_detail FROM public.partition_maintenance_runs
          ORDER BY ran_at DESC LIMIT 1) x
    UNION ALL
    SELECT 'partition_drain', x.ran_at, x.ok, x.locked_out,
           COALESCE(x.quarantined, 0)::bigint, x.error_detail
    FROM (SELECT ran_at, ok, locked_out, quarantined, error_detail FROM public.partition_drain_runs
          ORDER BY ran_at DESC LIMIT 1) x
    UNION ALL
    SELECT 'partition_quarantine', x.ran_at, x.ok, x.locked_out,
           COALESCE(x.total_quarantined, 0)::bigint, x.error_detail
    FROM (SELECT ran_at, ok, locked_out, total_quarantined, error_detail FROM public.partition_quarantine_runs
          ORDER BY ran_at DESC LIMIT 1) x
  LOOP
    age_hours := EXTRACT(EPOCH FROM (now() - rec.ran_at)) / 3600.0;
    severity  := NULL;
    reason    := NULL;

    IF age_hours > stale_hours THEN                       -- R2
      severity := 'critical';
      reason   := format('sem execução há %sh (limite %sh)', round(age_hours), stale_hours);
    ELSIF NOT rec.ok THEN                                  -- R3
      severity := 'critical';
      reason   := COALESCE('última execução falhou: ' || rec.error_detail, 'última execução falhou');
    ELSIF rec.backlog > backlog_max THEN                   -- R4
      severity := 'critical';
      reason   := format('backlog de %s linhas na partição DEFAULT', rec.backlog);
    ELSIF rec.locked_out THEN                              -- R5
      severity := 'warning';
      reason   := 'execução adiada por trava concorrente';
    ELSIF rec.backlog > 0 THEN                             -- R6
      severity := 'warning';
      reason   := format('backlog residual de %s linhas', rec.backlog);
    END IF;

    IF severity IS NOT NULL THEN
      -- R7/G2: silêncio de cooldown_hours por (rotina, severidade).
      IF EXISTS (
        SELECT 1 FROM public.maintenance_alert_events e
        WHERE e.routine = rec.routine
          AND e.severity = severity
          AND e.created_at > now() - make_interval(hours => cooldown_hours)
      ) THEN
        suppressed := suppressed + 1;
      ELSE
        INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
        VALUES (
          rec.routine, severity, reason,
          jsonb_build_object('backlog', rec.backlog, 'locked_out', rec.locked_out, 'ok', rec.ok),
          rec.ran_at
        );
        emitted := emitted + 1;
      END IF;
    END IF;

    results := results || jsonb_build_object(
      'routine',  rec.routine,
      'ran_at',   rec.ran_at,
      'severity', COALESCE(severity, 'none'),
      'reason',   COALESCE(reason, 'saudável')
    );
  END LOOP;

  -- G1: ausência de linha == rotina nunca executou (ou agendamento sumiu).
  FOR rec IN
    SELECT unnest(ARRAY['partition_maintenance','partition_drain','partition_quarantine']) AS routine
  LOOP
    IF NOT (results @> jsonb_build_array(jsonb_build_object('routine', rec.routine))
            OR EXISTS (SELECT 1 FROM jsonb_array_elements(results) x
                       WHERE x->>'routine' = rec.routine)) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.maintenance_alert_events e
        WHERE e.routine = rec.routine AND e.severity = 'critical'
          AND e.created_at > now() - make_interval(hours => cooldown_hours)
      ) THEN
        INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail)
        VALUES (rec.routine, 'critical', 'rotina nunca executou', '{"never_ran": true}'::jsonb);
        emitted := emitted + 1;
      ELSE
        suppressed := suppressed + 1;
      END IF;

      results := results || jsonb_build_object(
        'routine', rec.routine, 'ran_at', NULL,
        'severity', 'critical', 'reason', 'rotina nunca executou'
      );
    END IF;
  END LOOP;

  -- G8: retenção de 90 dias para a tabela não virar log infinito.
  DELETE FROM public.maintenance_alert_events
  WHERE created_at < now() - interval '90 days';

  RETURN jsonb_build_object(
    'emitted', emitted, 'suppressed', suppressed, 'routines', results
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.evaluate_maintenance_alerts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_maintenance_alerts() TO service_role;

-- ------------------------------------------------------------
-- Leitura para o painel (admin-only)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_maintenance_alert_status()
RETURNS TABLE(routine text, ran_at timestamptz, severity text, reason text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  stale_hours    constant int := 48;
  backlog_max    constant int := 10000;
  rec            record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'acesso restrito a administradores';
  END IF;

  FOR rec IN
    SELECT 'partition_maintenance'::text AS r, x.ran_at, x.ok, false AS locked_out, 0::bigint AS backlog
    FROM (SELECT ran_at, ok FROM public.partition_maintenance_runs ORDER BY ran_at DESC LIMIT 1) x
    UNION ALL
    SELECT 'partition_drain', x.ran_at, x.ok, x.locked_out, COALESCE(x.quarantined,0)::bigint
    FROM (SELECT ran_at, ok, locked_out, quarantined FROM public.partition_drain_runs ORDER BY ran_at DESC LIMIT 1) x
    UNION ALL
    SELECT 'partition_quarantine', x.ran_at, x.ok, x.locked_out, COALESCE(x.total_quarantined,0)::bigint
    FROM (SELECT ran_at, ok, locked_out, total_quarantined FROM public.partition_quarantine_runs ORDER BY ran_at DESC LIMIT 1) x
  LOOP
    routine := rec.r;
    ran_at  := rec.ran_at;

    IF EXTRACT(EPOCH FROM (now() - rec.ran_at)) / 3600.0 > stale_hours THEN
      severity := 'critical'; reason := 'sem execução na janela de 48h';
    ELSIF NOT rec.ok THEN
      severity := 'critical'; reason := 'última execução falhou';
    ELSIF rec.backlog > backlog_max THEN
      severity := 'critical'; reason := 'backlog acima do limite';
    ELSIF rec.locked_out THEN
      severity := 'warning';  reason := 'execução adiada por trava concorrente';
    ELSIF rec.backlog > 0 THEN
      severity := 'warning';  reason := 'backlog residual sob controle';
    ELSE
      severity := 'none';     reason := 'saudável';
    END IF;

    RETURN NEXT;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_maintenance_alert_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_maintenance_alert_status() TO authenticated, service_role;

-- ------------------------------------------------------------
-- Agendamento horário (minuto 23 para não colidir com as rotinas noturnas)
-- ------------------------------------------------------------
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('evaluate-maintenance-alerts')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluate-maintenance-alerts');

    PERFORM cron.schedule(
      'evaluate-maintenance-alerts',
      '23 * * * *',
      $job$SELECT public.evaluate_maintenance_alerts();$job$
    );
  END IF;
END
$cron$;