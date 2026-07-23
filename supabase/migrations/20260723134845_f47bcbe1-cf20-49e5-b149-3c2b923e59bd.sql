
CREATE OR REPLACE FUNCTION public.preview_success_alert(
  p_window_hours INTEGER DEFAULT 1,
  p_min_events   INTEGER DEFAULT 50,
  p_threshold    NUMERIC DEFAULT 0.90
)
RETURNS TABLE(
  window_hours   INTEGER,
  total_started  BIGINT,
  total_failed   BIGINT,
  total_relevant BIGINT,
  success_rate   NUMERIC,
  threshold_used NUMERIC,
  should_alert   BOOLEAN,
  generated_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s BIGINT := 0;
  f BIGINT := 0;
  r BIGINT := 0;
  rate NUMERIC := NULL;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN event_type = 'started' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN event_type = 'failed'  THEN 1 ELSE 0 END), 0)
    INTO s, f
    FROM public.preview_telemetry_events
   WHERE created_at >= now() - make_interval(hours => p_window_hours);

  r := s + f;
  IF r > 0 THEN rate := s::NUMERIC / r::NUMERIC; END IF;

  RETURN QUERY SELECT
    p_window_hours,
    s, f, r,
    rate,
    p_threshold,
    (r >= p_min_events AND rate IS NOT NULL AND rate < p_threshold),
    now();
END;
$$;

REVOKE ALL ON FUNCTION public.preview_success_alert(INTEGER, INTEGER, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_success_alert(INTEGER, INTEGER, NUMERIC) TO service_role;
