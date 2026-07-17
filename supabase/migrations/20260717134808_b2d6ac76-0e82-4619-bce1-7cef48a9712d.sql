
CREATE OR REPLACE FUNCTION public.get_table_size_stats(_min_size_mb integer DEFAULT 1)
RETURNS TABLE(
  schema_name text,
  table_name text,
  total_bytes bigint,
  heap_bytes bigint,
  index_bytes bigint,
  toast_bytes bigint,
  total_pretty text,
  heap_pretty text,
  index_pretty text,
  toast_pretty text,
  index_ratio_pct numeric,
  row_estimate bigint
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
    n.nspname::text,
    c.relname::text,
    pg_total_relation_size(c.oid)::bigint AS total_bytes,
    pg_relation_size(c.oid)::bigint AS heap_bytes,
    pg_indexes_size(c.oid)::bigint AS index_bytes,
    COALESCE(pg_total_relation_size(c.reltoastrelid), 0)::bigint AS toast_bytes,
    pg_size_pretty(pg_total_relation_size(c.oid))::text,
    pg_size_pretty(pg_relation_size(c.oid))::text,
    pg_size_pretty(pg_indexes_size(c.oid))::text,
    pg_size_pretty(COALESCE(pg_total_relation_size(c.reltoastrelid), 0))::text,
    CASE WHEN pg_relation_size(c.oid) > 0
      THEN ROUND(100.0 * pg_indexes_size(c.oid)::numeric / pg_relation_size(c.oid), 1)
      ELSE 0 END,
    c.reltuples::bigint
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND pg_total_relation_size(c.oid) >= (COALESCE(_min_size_mb, 1) * 1024 * 1024)
  ORDER BY pg_total_relation_size(c.oid) DESC
  LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.get_table_size_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_table_size_stats(integer) TO authenticated, service_role;
