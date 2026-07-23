
CREATE OR REPLACE FUNCTION public.cron_watchdog_ack_metrics()
RETURNS TABLE (
  window_label text,
  total_escalations bigint,
  acknowledged bigint,
  open bigint,
  ack_rate numeric,
  mtta_seconds numeric,
  p95_ack_seconds numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'insufficient_privileges';
  END IF;

  RETURN QUERY
  WITH windows AS (
    SELECT '24h'::text AS label, now() - interval '24 hours' AS since
    UNION ALL
    SELECT '7d'::text, now() - interval '7 days'
  ),
  base AS (
    SELECT w.label,
           e.acknowledged_at,
           EXTRACT(EPOCH FROM (e.acknowledged_at - e.created_at)) AS ack_secs
    FROM windows w
    LEFT JOIN public.cron_watchdog_escalations e
      ON e.created_at >= w.since
  )
  SELECT b.label,
         COUNT(*) FILTER (WHERE b.ack_secs IS NOT NULL OR b.acknowledged_at IS NULL) AS total_escalations,
         COUNT(*) FILTER (WHERE b.acknowledged_at IS NOT NULL) AS acknowledged,
         COUNT(*) FILTER (WHERE b.acknowledged_at IS NULL AND b.ack_secs IS NULL AND EXISTS (
             SELECT 1 FROM public.cron_watchdog_escalations e2
             WHERE e2.created_at >= (SELECT since FROM windows WHERE label = b.label)
         )) AS open,
         ROUND(
           CASE WHEN COUNT(*) FILTER (WHERE b.acknowledged_at IS NOT NULL OR b.ack_secs IS NULL) = 0 THEN 0
                ELSE COUNT(*) FILTER (WHERE b.acknowledged_at IS NOT NULL)::numeric * 100
                   / NULLIF(COUNT(*) FILTER (WHERE b.ack_secs IS NOT NULL OR b.acknowledged_at IS NOT NULL OR b.acknowledged_at IS NULL), 0)
           END, 2) AS ack_rate,
         ROUND(AVG(b.ack_secs) FILTER (WHERE b.ack_secs IS NOT NULL), 2) AS mtta_seconds,
         ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY b.ack_secs) FILTER (WHERE b.ack_secs IS NOT NULL), 2) AS p95_ack_seconds
  FROM base b
  GROUP BY b.label
  ORDER BY b.label;
END;
$$;

REVOKE ALL ON FUNCTION public.cron_watchdog_ack_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cron_watchdog_ack_metrics() TO authenticated;
