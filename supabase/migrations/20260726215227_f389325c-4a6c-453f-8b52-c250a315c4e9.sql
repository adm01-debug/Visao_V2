CREATE OR REPLACE FUNCTION public.evaluate_retention_alerts(p_now timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_grace          int;
  v_warn_factor    int;
  v_stalled_factor int;

  cooldown_floor   constant int := 60;
  cooldown_ceiling constant int := 360;

  rec              record;
  v_last_run       timestamptz;
  v_silence        numeric;
  v_warn_after     numeric;
  v_stalled_after  numeric;
  v_health         text;
  v_severity       text;
  v_reason         text;
  v_cooldown       int;
  v_routine_key    text;
  v_emitted        int := 0;
  v_suppressed     int := 0;
  v_results        jsonb := '[]'::jsonb;
BEGIN
  PERFORM set_config('statement_timeout', '20s', true);

  SELECT t.grace_minutes, t.warn_factor, t.stalled_factor
    INTO v_grace, v_warn_factor, v_stalled_factor
    FROM public.retention_health_thresholds() t;

  FOR rec IN SELECT * FROM public.retention_routine_registry() ORDER BY source_table LOOP
    EXECUTE format('SELECT max(executed_at) FROM public.%I', rec.source_table) INTO v_last_run;

    v_warn_after    := v_warn_factor * rec.cadence_minutes + v_grace;
    v_stalled_after := v_stalled_factor * rec.cadence_minutes + v_grace;
    v_routine_key   := 'retention:' || rec.job_name;
    v_cooldown      := least(cooldown_ceiling, greatest(cooldown_floor, rec.cadence_minutes));

    IF v_last_run IS NULL THEN
      v_health  := 'never';
      v_silence := NULL;
    ELSE
      v_silence := greatest(0, EXTRACT(EPOCH FROM (p_now - v_last_run)) / 60.0);
      v_health := CASE
        WHEN v_silence < v_warn_after    THEN 'ok'
        WHEN v_silence < v_stalled_after THEN 'warn'
        ELSE 'stalled'
      END;
    END IF;

    v_severity := CASE v_health
      WHEN 'never'   THEN 'critical'
      WHEN 'stalled' THEN 'critical'
      WHEN 'warn'    THEN 'warning'
      ELSE NULL
    END;

    IF v_severity IS NOT NULL THEN
      v_reason := CASE v_health
        WHEN 'never' THEN
          format('%s: rotina de expurgo nunca executou (cadência esperada de %s min)',
                 rec.label, rec.cadence_minutes)
        WHEN 'stalled' THEN
          format('%s: expurgo parado há %s min (cadência %s min)',
                 rec.label, round(v_silence), rec.cadence_minutes)
        ELSE
          format('%s: expurgo atrasado há %s min (cadência %s min)',
                 rec.label, round(v_silence), rec.cadence_minutes)
      END;

      IF EXISTS (
        SELECT 1 FROM public.maintenance_alert_events e
        WHERE e.routine = v_routine_key
          AND e.severity = v_severity
          AND e.created_at > p_now - make_interval(mins => v_cooldown)
      ) THEN
        v_suppressed := v_suppressed + 1;
      ELSE
        INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
        VALUES (
          v_routine_key, v_severity, v_reason,
          jsonb_build_object(
            'job_name',         rec.job_name,
            'source_table',     rec.source_table,
            'cadence_minutes',  rec.cadence_minutes,
            'health',           v_health,
            'silence_minutes',  CASE WHEN v_silence IS NULL THEN NULL ELSE round(v_silence) END,
            'cooldown_minutes', v_cooldown
          ),
          COALESCE(v_last_run, p_now)
        );
        v_emitted := v_emitted + 1;
      END IF;
    END IF;

    v_results := v_results || jsonb_build_object(
      'routine',         v_routine_key,
      'health',          v_health,
      'severity',        COALESCE(v_severity, 'none'),
      'last_run',        v_last_run,
      'silence_minutes', CASE WHEN v_silence IS NULL THEN NULL ELSE round(v_silence) END
    );
  END LOOP;

  RETURN jsonb_build_object(
    'evaluated_at', p_now,
    'emitted',      v_emitted,
    'suppressed',   v_suppressed,
    'routines',     v_results
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.evaluate_retention_alerts(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_retention_alerts(timestamptz) TO service_role;