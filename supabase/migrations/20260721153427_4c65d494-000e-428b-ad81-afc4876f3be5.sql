
CREATE OR REPLACE FUNCTION public.get_storage_tiering_slo(_window_hours INT DEFAULT 24)
RETURNS TABLE(
  operation TEXT,
  total_runs BIGINT,
  success_runs BIGINT,
  failed_runs BIGINT,
  success_rate NUMERIC,
  p50_duration_ms NUMERIC,
  p95_duration_ms NUMERIC,
  p99_duration_ms NUMERIC,
  target_p95_ms NUMERIC,
  slo_status TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH targets AS (
    SELECT * FROM (VALUES
      ('promote-hot-to-warm', 300000::NUMERIC),
      ('archive-warm-to-cold', 600000::NUMERIC),
      ('restore-from-glacier', 43200000::NUMERIC)
    ) AS t(op, target_ms)
  ),
  stats AS (
    SELECT
      r.operation AS op,
      COUNT(*)::BIGINT AS total,
      COUNT(*) FILTER (WHERE r.status = 'success')::BIGINT AS success,
      COUNT(*) FILTER (WHERE r.status = 'failed')::BIGINT AS failed,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY r.duration_ms) AS p50,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY r.duration_ms) AS p95,
      percentile_cont(0.99) WITHIN GROUP (ORDER BY r.duration_ms) AS p99
    FROM public.storage_tiering_runs r
    WHERE r.created_at > now() - (_window_hours || ' hours')::INTERVAL
    GROUP BY r.operation
  )
  SELECT
    t.op,
    COALESCE(s.total, 0),
    COALESCE(s.success, 0),
    COALESCE(s.failed, 0),
    CASE WHEN COALESCE(s.total,0) > 0 THEN ROUND((s.success::NUMERIC / s.total) * 100, 2) ELSE NULL END,
    ROUND(s.p50, 0),
    ROUND(s.p95, 0),
    ROUND(s.p99, 0),
    t.target_ms,
    CASE
      WHEN s.p95 IS NULL THEN 'no_data'
      WHEN s.p95 > t.target_ms THEN 'violated'
      WHEN s.p95 > t.target_ms * 0.8 THEN 'risk'
      ELSE 'ok'
    END
  FROM targets t
  LEFT JOIN stats s ON s.op = t.op
  ORDER BY t.op;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_storage_tiering_slo(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_storage_tiering_slo(INT) TO authenticated;
