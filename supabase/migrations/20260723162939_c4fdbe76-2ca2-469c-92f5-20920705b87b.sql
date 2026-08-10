CREATE OR REPLACE FUNCTION public.get_cron_job_runs(
  p_job_name text,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  runid bigint,
  jobid bigint,
  job_pid int,
  database text,
  username text,
  command text,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz
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
  SELECT r.runid, r.jobid, r.job_pid, r.database, r.username,
         r.command, r.status, r.return_message, r.start_time, r.end_time
  FROM cron.job_run_details r
  JOIN cron.job j ON j.jobid = r.jobid
  WHERE j.jobname = p_job_name
  ORDER BY r.start_time DESC
  LIMIT GREATEST(1, LEAST(200, COALESCE(p_limit, 20)));
END;
$$;

REVOKE ALL ON FUNCTION public.get_cron_job_runs(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cron_job_runs(text, int) TO authenticated;