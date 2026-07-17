CREATE OR REPLACE FUNCTION public.get_blocking_chains()
RETURNS TABLE(
  blocked_pid integer,
  blocked_user text,
  blocked_app text,
  blocked_state text,
  blocked_wait_event text,
  blocked_wait_seconds numeric,
  blocked_query text,
  blocking_pid integer,
  blocking_user text,
  blocking_app text,
  blocking_state text,
  blocking_query text,
  lock_type text,
  lock_mode text,
  relation text,
  severity text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    blocked.pid AS blocked_pid,
    COALESCE(blocked.usename::text, '-') AS blocked_user,
    COALESCE(blocked.application_name::text, '-') AS blocked_app,
    COALESCE(blocked.state::text, '-') AS blocked_state,
    COALESCE(blocked.wait_event::text, '-') AS blocked_wait_event,
    ROUND(EXTRACT(EPOCH FROM (now() - COALESCE(blocked.state_change, blocked.xact_start, blocked.query_start)))::numeric, 1)
      AS blocked_wait_seconds,
    LEFT(COALESCE(blocked.query, ''), 200) AS blocked_query,
    blocking.pid AS blocking_pid,
    COALESCE(blocking.usename::text, '-') AS blocking_user,
    COALESCE(blocking.application_name::text, '-') AS blocking_app,
    COALESCE(blocking.state::text, '-') AS blocking_state,
    LEFT(COALESCE(blocking.query, ''), 200) AS blocking_query,
    COALESCE(bl.locktype::text, '-') AS lock_type,
    COALESCE(bl.mode::text, '-') AS lock_mode,
    COALESCE(
      (SELECT n.nspname || '.' || c.relname
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.oid = bl.relation LIMIT 1),
      '-'
    ) AS relation,
    CASE
      WHEN EXTRACT(EPOCH FROM (now() - COALESCE(blocked.state_change, blocked.xact_start, blocked.query_start))) > 30 THEN 'critical'
      WHEN EXTRACT(EPOCH FROM (now() - COALESCE(blocked.state_change, blocked.xact_start, blocked.query_start))) > 5 THEN 'warning'
      ELSE 'info'
    END AS severity
  FROM pg_stat_activity blocked
  JOIN LATERAL unnest(pg_blocking_pids(blocked.pid)) AS blocking_pid_v(pid) ON TRUE
  JOIN pg_stat_activity blocking ON blocking.pid = blocking_pid_v.pid
  LEFT JOIN pg_locks bl ON bl.pid = blocked.pid AND NOT bl.granted
  WHERE blocked.pid <> pg_backend_pid()
    AND blocked.backend_type = 'client backend'
  ORDER BY blocked_wait_seconds DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_blocking_chains() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_blocking_chains() TO authenticated, service_role;

COMMENT ON FUNCTION public.get_blocking_chains() IS
'Onda 87: Detector de cadeias de bloqueio via pg_blocking_pids. Admin-only.';