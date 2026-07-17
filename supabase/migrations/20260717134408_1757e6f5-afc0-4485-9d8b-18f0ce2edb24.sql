
CREATE OR REPLACE FUNCTION public.get_table_cache_stats(_min_activity bigint DEFAULT 1000)
RETURNS TABLE(
  schema_name text,
  table_name text,
  heap_hit bigint,
  heap_read bigint,
  heap_hit_ratio numeric,
  idx_hit bigint,
  idx_read bigint,
  idx_hit_ratio numeric,
  total_reads bigint,
  table_size_pretty text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    s.schemaname::text,
    s.relname::text,
    s.heap_blks_hit::bigint,
    s.heap_blks_read::bigint,
    CASE WHEN (s.heap_blks_hit + s.heap_blks_read) > 0
      THEN ROUND(100.0 * s.heap_blks_hit::numeric / (s.heap_blks_hit + s.heap_blks_read), 2)
      ELSE NULL END AS heap_hit_ratio,
    COALESCE(s.idx_blks_hit, 0)::bigint,
    COALESCE(s.idx_blks_read, 0)::bigint,
    CASE WHEN (COALESCE(s.idx_blks_hit, 0) + COALESCE(s.idx_blks_read, 0)) > 0
      THEN ROUND(100.0 * COALESCE(s.idx_blks_hit, 0)::numeric
           / (COALESCE(s.idx_blks_hit, 0) + COALESCE(s.idx_blks_read, 0)), 2)
      ELSE NULL END AS idx_hit_ratio,
    (s.heap_blks_read + COALESCE(s.idx_blks_read, 0))::bigint AS total_reads,
    pg_size_pretty(pg_relation_size(s.relid))::text AS table_size_pretty
  FROM pg_statio_user_tables s
  WHERE s.schemaname = 'public'
    AND (s.heap_blks_hit + s.heap_blks_read) >= COALESCE(_min_activity, 1000)
  ORDER BY (s.heap_blks_read + COALESCE(s.idx_blks_read, 0)) DESC
  LIMIT 30;
END;
$$;

REVOKE ALL ON FUNCTION public.get_table_cache_stats(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_table_cache_stats(bigint) TO authenticated, service_role;
