CREATE OR REPLACE FUNCTION public.evaluate_retention_alerts(p_now timestamp with time zone DEFAULT now())
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
  v_age            numeric;
  v_warn_after     numeric;
  v_stalled_after  numeric;
  v_debut_after    numeric;
  v_health         text;
  v_severity       text;
  v_reason         text;
  v_cooldown       int;
  v_routine_key    text;
  v_emitted        int := 0;
  v_suppressed     int := 0;
  v_pending        int := 0;
  v_results        jsonb := '[]'::jsonb;
BEGIN
  IF p_now IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_now');
  END IF;

  PERFORM set_config('statement_timeout', '20s', true);

  SELECT t.grace_minutes, t.warn_factor, t.stalled_factor
    INTO v_grace, v_warn_factor, v_stalled_factor
    FROM public.retention_health_thresholds() t;

  FOR rec IN SELECT * FROM public.retention_routine_registry() ORDER BY source_table LOOP
    EXECUTE format('SELECT max(executed_at) FROM public.%I', rec.source_table) INTO v_last_run;

    -- U8: execução no futuro não prova trabalho feito.
    IF v_last_run IS NOT NULL AND v_last_run > p_now THEN
      v_last_run := NULL;
    END IF;

    v_warn_after    := v_warn_factor * rec.cadence_minutes + v_grace;
    v_stalled_after := v_stalled_factor * rec.cadence_minutes + v_grace;
    v_debut_after   := rec.cadence_minutes + v_grace;
    v_routine_key   := 'retention:' || rec.job_name;
    v_cooldown      := least(cooldown_ceiling, greatest(cooldown_floor, rec.cadence_minutes));

    -- U7: registro no futuro é ilegível, nunca carência infinita.
    v_age := CASE
      WHEN rec.registered_at IS NULL OR rec.registered_at > p_now THEN NULL
      ELSE greatest(0, EXTRACT(EPOCH FROM (p_now - rec.registered_at)) / 60.0)
    END;

    IF v_last_run IS NOT NULL THEN
      v_silence := greatest(0, EXTRACT(EPOCH FROM (p_now - v_last_run)) / 60.0);
      v_health := CASE
        WHEN v_silence < v_warn_after    THEN 'ok'
        WHEN v_silence < v_stalled_after THEN 'warn'
        ELSE 'stalled'
      END;
    ELSE
      v_silence := NULL;
      v_health := CASE
        WHEN v_age IS NULL         THEN 'never'              -- U4
        WHEN v_age < v_debut_after THEN 'pending_first_run'  -- U5
        ELSE 'never'                                         -- U6
      END;
    END IF;

    v_severity := CASE v_health
      WHEN 'never'   THEN 'critical'
      WHEN 'stalled' THEN 'critical'
      WHEN 'warn'    THEN 'warning'
      ELSE NULL
    END;

    IF v_health = 'pending_first_run' THEN
      v_pending := v_pending + 1;
    END IF;

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
            'age_minutes',      CASE WHEN v_age IS NULL THEN NULL ELSE round(v_age) END,
            'cooldown_minutes', v_cooldown
          ),
          COALESCE(v_last_run, p_now)
        );
        v_emitted := v_emitted + 1;
      END IF;
    END IF;

    v_results := v_results || jsonb_build_object(
      'routine',         v_routine_key,
      'job_name',        rec.job_name,
      'health',          v_health,
      'severity',        coalesce(v_severity, 'none'),
      'last_run',        v_last_run,
      'silence_minutes', CASE WHEN v_silence IS NULL THEN NULL ELSE round(v_silence) END,
      'age_minutes',     CASE WHEN v_age IS NULL THEN NULL ELSE round(v_age) END
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'evaluated_at', p_now,
    'emitted', v_emitted,
    'suppressed', v_suppressed,
    'pending_first_run', v_pending,
    'routines', v_results
  );
END;
$function$;