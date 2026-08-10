
CREATE OR REPLACE FUNCTION public.get_unused_indexes(_min_size_mb integer DEFAULT 1, _max_scans bigint DEFAULT 50)
RETURNS TABLE(
  schema_name text,
  table_name text,
  index_name text,
  index_size_bytes bigint,
  index_size_pretty text,
  idx_scan bigint,
  idx_tup_read bigint,
  table_size_bytes bigint,
  is_unique boolean,
  is_primary boolean,
  definition text
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
    s.indexrelname::text,
    pg_relation_size(s.indexrelid)::bigint AS index_size_bytes,
    pg_size_pretty(pg_relation_size(s.indexrelid))::text AS index_size_pretty,
    s.idx_scan::bigint,
    s.idx_tup_read::bigint,
    pg_relation_size(s.relid)::bigint AS table_size_bytes,
    i.indisunique AS is_unique,
    i.indisprimary AS is_primary,
    pg_get_indexdef(s.indexrelid)::text AS definition
  FROM pg_stat_user_indexes s
  JOIN pg_index i ON i.indexrelid = s.indexrelid
  WHERE s.schemaname = 'public'
    AND s.idx_scan <= COALESCE(_max_scans, 50)
    AND NOT i.indisunique
    AND NOT i.indisprimary
    AND pg_relation_size(s.indexrelid) >= (COALESCE(_min_size_mb, 1) * 1024 * 1024)
    AND s.relname NOT LIKE '%_m20%'
    AND s.relname NOT LIKE '%_y20%'
  ORDER BY pg_relation_size(s.indexrelid) DESC
  LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.get_unused_indexes(integer, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unused_indexes(integer, bigint) TO authenticated, service_role;
