CREATE OR REPLACE FUNCTION public.list_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  active boolean,
  last_run timestamptz,
  last_status text,
  last_message text,
  failure_count_24h bigint,
  success_count_24h bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'insufficient_privileges' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH last_run AS (
    SELECT DISTINCT ON (r.jobid)
      r.jobid, r.start_time, r.status, r.return_message
    FROM cron.job_run_details r
    ORDER BY r.jobid, r.start_time DESC
  ),
  agg AS (
    SELECT
      r.jobid,
      COUNT(*) FILTER (WHERE lower(r.status) = 'failed' AND r.start_time > now() - interval '24 hours') AS fails,
      COUNT(*) FILTER (WHERE lower(r.status) = 'succeeded' AND r.start_time > now() - interval '24 hours') AS succs
    FROM cron.job_run_details r
    WHERE r.start_time > now() - interval '24 hours'
    GROUP BY r.jobid
  )
  SELECT
    j.jobid,
    j.jobname,
    j.schedule,
    j.active,
    lr.start_time,
    lr.status,
    lr.return_message,
    COALESCE(a.fails, 0),
    COALESCE(a.succs, 0)
  FROM cron.job j
  LEFT JOIN last_run lr ON lr.jobid = j.jobid
  LEFT JOIN agg a ON a.jobid = j.jobid
  ORDER BY (COALESCE(a.fails, 0) > 0) DESC, j.jobname ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_cron_jobs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_cron_jobs() TO authenticated;