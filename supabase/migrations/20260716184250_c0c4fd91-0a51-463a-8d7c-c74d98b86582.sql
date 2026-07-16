CREATE OR REPLACE FUNCTION public.get_slow_queries(_limit int DEFAULT 20)
RETURNS TABLE (
  query text,
  calls bigint,
  mean_ms double precision,
  total_ms double precision,
  max_ms double precision,
  rows_returned bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  n int := COALESCE(_limit, 20);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  IF n < 1 THEN n := 20; END IF;
  IF n > 100 THEN n := 100; END IF;

  RETURN QUERY
    SELECT
      pss.query::text,
      pss.calls::bigint,
      pss.mean_exec_time::double precision AS mean_ms,
      pss.total_exec_time::double precision AS total_ms,
      pss.max_exec_time::double precision AS max_ms,
      pss.rows::bigint AS rows_returned
    FROM extensions.pg_stat_statements pss
    JOIN pg_roles r ON r.oid = pss.userid
    WHERE pss.query IS NOT NULL
      AND pss.query NOT LIKE '<%'
      AND pss.query !~* '^\s*(BEGIN|COMMIT|ROLLBACK|SET |SHOW |RESET )'
      AND r.rolname NOT IN ('supabase_admin', 'supabase_auth_admin', 'supabase_storage_admin', 'supabase_replication_admin')
    ORDER BY pss.total_exec_time DESC
    LIMIT n;
END;
$$;

REVOKE ALL ON FUNCTION public.get_slow_queries(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_slow_queries(int) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_slow_queries(int) IS
  'Wave 27: admin-only ranking of the slowest queries (pg_stat_statements). Callable only by admins via has_role guard.';