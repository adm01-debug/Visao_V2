
CREATE OR REPLACE FUNCTION public.get_table_bloat_estimate(_min_size_mb int DEFAULT 10, _limit int DEFAULT 30)
RETURNS TABLE (
  schema_name text,
  table_name text,
  live_tuples bigint,
  dead_tuples bigint,
  dead_ratio numeric,
  total_bytes bigint,
  estimated_bloat_bytes bigint,
  last_vacuum timestamptz,
  last_autovacuum timestamptz,
  recommendation text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  RETURN QUERY
  SELECT
    n.nspname::text AS schema_name,
    c.relname::text AS table_name,
    COALESCE(s.n_live_tup, 0)::bigint AS live_tuples,
    COALESCE(s.n_dead_tup, 0)::bigint AS dead_tuples,
    CASE
      WHEN COALESCE(s.n_live_tup, 0) + COALESCE(s.n_dead_tup, 0) = 0 THEN 0
      ELSE round(
        (COALESCE(s.n_dead_tup, 0)::numeric
          / NULLIF(COALESCE(s.n_live_tup, 0) + COALESCE(s.n_dead_tup, 0), 0)) * 100, 2
      )
    END AS dead_ratio,
    pg_total_relation_size(c.oid)::bigint AS total_bytes,
    CASE
      WHEN COALESCE(s.n_live_tup, 0) + COALESCE(s.n_dead_tup, 0) = 0 THEN 0
      ELSE (pg_relation_size(c.oid)
        * (COALESCE(s.n_dead_tup, 0)::numeric
          / NULLIF(COALESCE(s.n_live_tup, 0) + COALESCE(s.n_dead_tup, 0), 0)))::bigint
    END AS estimated_bloat_bytes,
    s.last_vacuum,
    s.last_autovacuum,
    CASE
      WHEN COALESCE(s.n_live_tup, 0) + COALESCE(s.n_dead_tup, 0) = 0 THEN 'ok'
      WHEN (COALESCE(s.n_dead_tup, 0)::numeric
        / NULLIF(COALESCE(s.n_live_tup, 0) + COALESCE(s.n_dead_tup, 0), 0)) > 0.4 THEN 'VACUUM FULL recomendado'
      WHEN (COALESCE(s.n_dead_tup, 0)::numeric
        / NULLIF(COALESCE(s.n_live_tup, 0) + COALESCE(s.n_dead_tup, 0), 0)) > 0.2 THEN 'VACUUM ANALYZE recomendado'
      ELSE 'ok'
    END::text AS recommendation
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
  WHERE c.relkind = 'r'
    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'realtime',
                          'supabase_functions', 'vault', 'extensions', 'graphql', 'graphql_public',
                          'net', 'pgsodium', 'pgsodium_masks')
    AND pg_total_relation_size(c.oid) >= (_min_size_mb::bigint * 1024 * 1024)
  ORDER BY
    CASE
      WHEN COALESCE(s.n_live_tup, 0) + COALESCE(s.n_dead_tup, 0) = 0 THEN 0
      ELSE (pg_relation_size(c.oid)
        * (COALESCE(s.n_dead_tup, 0)::numeric
          / NULLIF(COALESCE(s.n_live_tup, 0) + COALESCE(s.n_dead_tup, 0), 0)))
    END DESC
  LIMIT _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_table_bloat_estimate(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_table_bloat_estimate(int, int) TO authenticated;
