CREATE OR REPLACE FUNCTION public.evaluate_retention_alerts(p_now timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  grace_minutes   int;
  warn_factor     int;
  stalled_factor  int;

  cooldown_floor   constant int := 60;
  cooldown_ceiling constant int := 360;

  rec              record;
  last_run         timestamptz;
  silence_minutes  numeric;
  warn_after       numeric;
  stalled_after    numeric;
  health           text;
  severity         text;
  reason           text;
  cooldown         int;
  routine_key      text;
  emitted          int := 0;
  suppressed       int := 0;
  results          jsonb := '[]'::jsonb;
BEGIN
  PERFORM set_config('statement_timeout', '20s', true);

  SELECT t.grace_minutes, t.warn_factor, t.stalled_factor
    INTO grace_minutes, warn_factor, stalled_factor
    FROM public.retention_health_thresholds() t;

  FOR rec IN SELECT * FROM public.retention_routine_registry() ORDER BY source_table LOOP
    EXECUTE format('SELECT max(executed_at) FROM public.%I', rec.source_table) INTO last_run;

    warn_after    := warn_factor * rec.cadence_minutes + grace_minutes;
    stalled_after := stalled_factor * rec.cadence_minutes + grace_minutes;
    routine_key   := 'retention:' || rec.job_name;
    cooldown      := least(cooldown_ceiling, greatest(cooldown_floor, rec.cadence_minutes));

    IF last_run IS NULL THEN
      health          := 'never';
      silence_minutes := NULL;
    ELSE
      -- Silêncio negativo (relógio adiantado de quem gravou a linha) vira zero.
      silence_minutes := greatest(0, EXTRACT(EPOCH FROM (p_now - last_run)) / 60.0);
      health := CASE
        WHEN silence_minutes < warn_after    THEN 'ok'
        WHEN silence_minutes < stalled_after THEN 'warn'
        ELSE 'stalled'
      END;
    END IF;

    severity := CASE health
      WHEN 'never'   THEN 'critical'
      WHEN 'stalled' THEN 'critical'
      WHEN 'warn'    THEN 'warning'
      ELSE NULL
    END;

    IF severity IS NOT NULL THEN
      reason := CASE health
        WHEN 'never' THEN
          format('%s: rotina de expurgo nunca executou (cadência esperada de %s min)',
                 rec.label, rec.cadence_minutes)
        WHEN 'stalled' THEN
          format('%s: expurgo parado há %s min (cadência %s min)',
                 rec.label, round(silence_minutes), rec.cadence_minutes)
        ELSE
          format('%s: expurgo atrasado há %s min (cadência %s min)',
                 rec.label, round(silence_minutes), rec.cadence_minutes)
      END;

      IF EXISTS (
        SELECT 1 FROM public.maintenance_alert_events e
        WHERE e.routine = routine_key
          AND e.severity = severity
          AND e.created_at > p_now - make_interval(mins => cooldown)
      ) THEN
        suppressed := suppressed + 1;
      ELSE
        INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
        VALUES (
          routine_key, severity, reason,
          jsonb_build_object(
            'job_name',        rec.job_name,
            'source_table',    rec.source_table,
            'cadence_minutes', rec.cadence_minutes,
            'health',          health,
            'silence_minutes', CASE WHEN silence_minutes IS NULL THEN NULL ELSE round(silence_minutes) END,
            'cooldown_minutes', cooldown
          ),
          COALESCE(last_run, p_now)
        );
        emitted := emitted + 1;
      END IF;
    END IF;

    results := results || jsonb_build_object(
      'routine',  routine_key,
      'health',   health,
      'severity', COALESCE(severity, 'none'),
      'last_run', last_run,
      'silence_minutes', CASE WHEN silence_minutes IS NULL THEN NULL ELSE round(silence_minutes) END
    );
  END LOOP;

  RETURN jsonb_build_object(
    'evaluated_at', p_now,
    'emitted',      emitted,
    'suppressed',   suppressed,
    'routines',     results
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.evaluate_retention_alerts(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_retention_alerts(timestamptz) TO service_role;

SELECT cron.unschedule('evaluate-retention-alerts')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluate-retention-alerts');

SELECT cron.schedule(
  'evaluate-retention-alerts',
  '33 * * * *',
  $cron$ SELECT public.evaluate_retention_alerts(); $cron$
);