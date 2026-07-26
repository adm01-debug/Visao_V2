-- ============================================================================
-- Onda 122 — Saúde de reentrega da fila de relay.
-- Espelha src/lib/relayRedeliveryHealth.ts (constantes + Wilson + histerese).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.wilson_lower_bound(successes bigint, total bigint)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN COALESCE(total, 0) <= 0 THEN 0::double precision
    ELSE GREATEST(0::double precision, LEAST(1::double precision,
      ( (LEAST(GREATEST(successes,0), total)::double precision / total)
        + (1.959963984540054 ^ 2) / (2 * total)
        - 1.959963984540054 * sqrt(
            ( (LEAST(GREATEST(successes,0), total)::double precision / total)
              * (1 - (LEAST(GREATEST(successes,0), total)::double precision / total))
              + (1.959963984540054 ^ 2) / (4 * total)
            ) / total)
      ) / (1 + (1.959963984540054 ^ 2) / total)
    ))
  END;
$$;

REVOKE ALL ON FUNCTION public.wilson_lower_bound(bigint, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wilson_lower_bound(bigint, bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.evaluate_relay_redelivery(
  window_hours   integer DEFAULT 6,
  min_samples    integer DEFAULT 20,
  warn_rate      double precision DEFAULT 0.15,
  critical_rate  double precision DEFAULT 0.35,
  hysteresis     double precision DEFAULT 0.05,
  cooldown_hours integer DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec         record;
  prev_sev    text;
  sev         text;
  thr         double precision;
  reason      text;
  emitted     integer := 0;
  suppressed  integer := 0;
  evaluated   integer := 0;
  results     jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'apenas administradores podem executar evaluate_relay_redelivery';
  END IF;

  window_hours  := LEAST(GREATEST(COALESCE(window_hours, 6), 1), 168);
  min_samples   := LEAST(GREATEST(COALESCE(min_samples, 20), 1), 100000);
  warn_rate     := LEAST(GREATEST(COALESCE(warn_rate, 0.15), 0.0), 1.0);
  critical_rate := LEAST(GREATEST(COALESCE(critical_rate, 0.35), warn_rate), 1.0);
  hysteresis    := LEAST(GREATEST(COALESCE(hysteresis, 0.05), 0.0), 0.5);

  PERFORM set_config('statement_timeout', '60s', true);

  FOR rec IN
    SELECT t.agent_id,
           count(*)::bigint AS deliveries,
           -- Reentrega imputável: mais de uma reivindicação E encerramento que
           -- NÃO foi decisão administrativa nossa (Ondas 119/120/121).
           count(*) FILTER (
             WHERE COALESCE(t.attempts, 1) > 1
               AND COALESCE(t.error, '') NOT IN ('task_expired_unfair_window',
                                                 'task_expired_deadline',
                                                 'backend_timeout',
                                                 'relay_backend_abandoned')
           )::bigint AS redeliveries
      FROM public.agent_relay_tasks t
     WHERE t.agent_id IS NOT NULL
       AND t.created_at > now() - make_interval(hours => window_hours)
       AND t.status IN ('done', 'failed', 'expired')
     GROUP BY t.agent_id
  LOOP
    evaluated := evaluated + 1;

    SELECT e.severity INTO prev_sev
      FROM public.maintenance_alert_events e
     WHERE e.routine = 'relay_redelivery'
       AND e.detail->>'agent_id' = rec.agent_id::text
     ORDER BY e.created_at DESC
     LIMIT 1;

    sev := 'none';

    IF rec.deliveries >= min_samples AND rec.redeliveries > 0 THEN
      -- Histerese: quem já está no nível permanece com o limiar reduzido.
      thr := CASE WHEN prev_sev = 'critical'
                  THEN GREATEST(0, critical_rate - hysteresis)
                  ELSE critical_rate END;

      IF public.wilson_lower_bound(rec.redeliveries, rec.deliveries) >= thr THEN
        sev := 'critical';
      ELSE
        thr := CASE WHEN prev_sev IN ('warning', 'critical')
                    THEN GREATEST(0, warn_rate - hysteresis)
                    ELSE warn_rate END;
        IF public.wilson_lower_bound(rec.redeliveries, rec.deliveries) >= thr THEN
          sev := 'warning';
        END IF;
      END IF;
    END IF;

    IF sev <> 'none' THEN
      reason := format(
        'agente %s: reentrega imputável em %s de %s entregas (piso estatístico %s%%) na janela de %sh',
        rec.agent_id, rec.redeliveries, rec.deliveries,
        round((public.wilson_lower_bound(rec.redeliveries, rec.deliveries) * 100)::numeric, 1),
        window_hours);

      IF EXISTS (
        SELECT 1 FROM public.maintenance_alert_events e
         WHERE e.routine = 'relay_redelivery'
           AND e.severity = sev
           AND e.detail->>'agent_id' = rec.agent_id::text
           AND e.created_at > now() - make_interval(hours => cooldown_hours)
      ) THEN
        suppressed := suppressed + 1;
      ELSE
        INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail)
        VALUES ('relay_redelivery', sev, reason,
                jsonb_build_object(
                  'agent_id',      rec.agent_id,
                  'deliveries',    rec.deliveries,
                  'redeliveries',  rec.redeliveries,
                  'observed_rate', round((rec.redeliveries::numeric / rec.deliveries), 4),
                  'lower_bound',   round(public.wilson_lower_bound(rec.redeliveries, rec.deliveries)::numeric, 4),
                  'window_hours',  window_hours,
                  'min_samples',   min_samples));
        emitted := emitted + 1;
      END IF;
    END IF;

    results := results || jsonb_build_object(
      'agent_id',     rec.agent_id,
      'deliveries',   rec.deliveries,
      'redeliveries', rec.redeliveries,
      'severity',     sev);
  END LOOP;

  RETURN jsonb_build_object(
    'ok',           true,
    'evaluated',    evaluated,
    'emitted',      emitted,
    'suppressed',   suppressed,
    'window_hours', window_hours,
    'agents',       results);
END $$;

REVOKE ALL ON FUNCTION public.evaluate_relay_redelivery(integer, integer, double precision, double precision, double precision, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_relay_redelivery(integer, integer, double precision, double precision, double precision, integer) TO service_role;

SELECT cron.schedule(
  'relay-redelivery-health',
  '23 * * * *',
  $$SELECT public.evaluate_relay_redelivery();$$
);