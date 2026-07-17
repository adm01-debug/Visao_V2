
CREATE OR REPLACE FUNCTION public.check_csp_anomaly()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_hour_count bigint := 0;
  baseline_avg numeric := 0;
  ratio numeric := 0;
  threshold_ratio numeric := 3.0;
  min_events int := 10;
  top_directive text;
  top_blocked text;
  alert_id uuid;
BEGIN
  SELECT COUNT(*) INTO last_hour_count
  FROM public.csp_violation_reports
  WHERE created_at > now() - interval '1 hour';

  SELECT COALESCE(COUNT(*) / 24.0, 0) INTO baseline_avg
  FROM public.csp_violation_reports
  WHERE created_at > now() - interval '25 hours'
    AND created_at <= now() - interval '1 hour';

  IF baseline_avg > 0 THEN
    ratio := last_hour_count / baseline_avg;
  ELSIF last_hour_count >= min_events THEN
    ratio := threshold_ratio; -- baseline zero + evento novo suficiente = anomalia
  END IF;

  IF last_hour_count < min_events OR ratio < threshold_ratio THEN
    RETURN jsonb_build_object(
      'anomaly', false,
      'last_hour', last_hour_count,
      'baseline_avg', baseline_avg,
      'ratio', ratio,
      'checked_at', now()
    );
  END IF;

  SELECT COALESCE(effective_directive, violated_directive, 'unknown') INTO top_directive
  FROM public.csp_violation_reports
  WHERE created_at > now() - interval '1 hour'
  GROUP BY 1
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT COALESCE(blocked_uri, 'inline') INTO top_blocked
  FROM public.csp_violation_reports
  WHERE created_at > now() - interval '1 hour'
  GROUP BY 1
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  alert_id := gen_random_uuid();
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, severity, new_values)
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'security.csp_anomaly',
    'csp_violation_reports',
    alert_id,
    'high',
    jsonb_build_object(
      'last_hour', last_hour_count,
      'baseline_avg', ROUND(baseline_avg, 2),
      'ratio', ROUND(ratio, 2),
      'threshold_ratio', threshold_ratio,
      'top_directive', top_directive,
      'top_blocked', top_blocked
    )
  );

  RETURN jsonb_build_object(
    'anomaly', true,
    'alert_id', alert_id,
    'last_hour', last_hour_count,
    'baseline_avg', ROUND(baseline_avg, 2),
    'ratio', ROUND(ratio, 2),
    'top_directive', top_directive,
    'top_blocked', top_blocked,
    'checked_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_csp_anomaly() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('visao-csp-anomaly-check');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'visao-csp-anomaly-check',
  '*/15 * * * *',
  $cron$ SELECT public.check_csp_anomaly(); $cron$
);
