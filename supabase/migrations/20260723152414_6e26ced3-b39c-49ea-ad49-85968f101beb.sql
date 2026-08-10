
CREATE OR REPLACE FUNCTION public.get_retention_overview()
RETURNS TABLE (
  job_name text,
  last_run timestamptz,
  hours_since_last numeric,
  health text,
  runs_last_30d bigint,
  deleted_last_30d bigint,
  retention_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
  WITH relay AS (
    SELECT
      'agent_relay_tasks'::text AS job_name,
      max(executed_at) AS last_run,
      count(*) FILTER (WHERE executed_at > now() - interval '30 days') AS runs_30d,
      COALESCE(sum(deleted_count) FILTER (WHERE executed_at > now() - interval '30 days'), 0) AS deleted_30d,
      (SELECT r.retention_days FROM public.agent_relay_purge_runs r
        ORDER BY executed_at DESC LIMIT 1) AS ret_days
    FROM public.agent_relay_purge_runs
  ),
  disc AS (
    SELECT
      'agent_discoveries'::text AS job_name,
      max(executed_at) AS last_run,
      count(*) FILTER (WHERE executed_at > now() - interval '30 days') AS runs_30d,
      COALESCE(sum(deleted_count) FILTER (WHERE executed_at > now() - interval '30 days'), 0) AS deleted_30d,
      (SELECT r.retention_days FROM public.agent_discoveries_purge_runs r
        ORDER BY executed_at DESC LIMIT 1) AS ret_days
    FROM public.agent_discoveries_purge_runs
  ),
  unioned AS (
    SELECT * FROM relay
    UNION ALL
    SELECT * FROM disc
  )
  SELECT
    u.job_name,
    u.last_run,
    CASE WHEN u.last_run IS NULL THEN NULL
         ELSE round(EXTRACT(EPOCH FROM (now() - u.last_run))::numeric / 3600.0, 1)
    END AS hours_since_last,
    CASE
      WHEN u.last_run IS NULL THEN 'never'
      WHEN now() - u.last_run < interval '30 hours' THEN 'ok'
      WHEN now() - u.last_run < interval '48 hours' THEN 'warn'
      ELSE 'stalled'
    END AS health,
    u.runs_30d,
    u.deleted_30d,
    u.ret_days
  FROM unioned u
  ORDER BY u.job_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_retention_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_retention_overview() TO authenticated;
