
CREATE OR REPLACE FUNCTION public.get_long_running_sessions(
  _active_min_secs int DEFAULT 30,
  _idle_tx_min_secs int DEFAULT 60
)
RETURNS TABLE(
  pid int,
  usename text,
  application_name text,
  client_addr inet,
  state text,
  wait_event_type text,
  wait_event text,
  query_start timestamptz,
  state_change timestamptz,
  runtime_secs numeric,
  query text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    a.pid,
    a.usename::text,
    a.application_name::text,
    a.client_addr,
    a.state::text,
    a.wait_event_type::text,
    a.wait_event::text,
    a.query_start,
    a.state_change,
    ROUND(EXTRACT(EPOCH FROM (now() - a.query_start))::numeric, 1) AS runtime_secs,
    LEFT(a.query, 500)::text
  FROM pg_stat_activity a
  WHERE a.datname = current_database()
    AND a.pid <> pg_backend_pid()
    AND (
      (a.state = 'active' AND a.query_start < now() - make_interval(secs => COALESCE(_active_min_secs, 30)))
      OR
      (a.state = 'idle in transaction' AND a.state_change < now() - make_interval(secs => COALESCE(_idle_tx_min_secs, 60)))
    )
  ORDER BY a.query_start ASC NULLS LAST
  LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.get_long_running_sessions(int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_long_running_sessions(int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_blocking_locks()
RETURNS TABLE(
  blocked_pid int,
  blocked_user text,
  blocked_statement text,
  blocking_pid int,
  blocking_user text,
  blocking_statement text,
  blocked_wait_secs numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    blocked_activity.pid AS blocked_pid,
    blocked_activity.usename::text AS blocked_user,
    LEFT(blocked_activity.query, 300)::text AS blocked_statement,
    blocking_activity.pid AS blocking_pid,
    blocking_activity.usename::text AS blocking_user,
    LEFT(blocking_activity.query, 300)::text AS blocking_statement,
    ROUND(EXTRACT(EPOCH FROM (now() - blocked_activity.query_start))::numeric, 1) AS blocked_wait_secs
  FROM pg_locks blocked_locks
  JOIN pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
  JOIN pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid <> blocked_locks.pid
  JOIN pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
  WHERE NOT blocked_locks.granted
    AND blocking_locks.granted
  ORDER BY blocked_wait_secs DESC
  LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.get_blocking_locks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_blocking_locks() TO authenticated;
