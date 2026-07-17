DROP FUNCTION IF EXISTS public.get_duplicate_indexes();

CREATE OR REPLACE FUNCTION public.get_duplicate_indexes()
RETURNS TABLE(
  schema_name text,
  table_name text,
  keeper_index text,
  duplicate_index text,
  index_definition text,
  size_bytes bigint,
  recommendation text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH idx AS (
    SELECT
      n.nspname::text  AS schema_name,
      c.relname::text  AS table_name,
      i.relname::text  AS index_name,
      pg_get_indexdef(x.indexrelid)::text AS full_def,
      regexp_replace(pg_get_indexdef(x.indexrelid), 'INDEX\s+\S+\s+ON', 'INDEX ON')::text AS norm_def,
      pg_relation_size(x.indexrelid)::bigint AS size_bytes,
      x.indexrelid::oid AS oid
    FROM pg_index x
    JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_class c ON c.oid = x.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND NOT x.indisprimary
  ),
  grouped AS (
    SELECT
      i.schema_name,
      i.table_name,
      i.norm_def,
      array_agg(i.index_name ORDER BY i.oid) AS names,
      array_agg(i.size_bytes ORDER BY i.oid) AS sizes,
      array_agg(i.full_def ORDER BY i.oid) AS defs
    FROM idx i
    GROUP BY i.schema_name, i.table_name, i.norm_def
    HAVING count(*) > 1
  ),
  expanded AS (
    SELECT
      g.schema_name,
      g.table_name,
      g.names[1] AS keeper_index,
      g.defs[1]  AS index_definition,
      dup.dup_name,
      dup.dup_size
    FROM grouped g
    CROSS JOIN LATERAL (
      SELECT
        g.names[i]  AS dup_name,
        g.sizes[i]  AS dup_size
      FROM generate_series(2, array_length(g.names, 1)) AS i
    ) dup
  )
  SELECT
    e.schema_name,
    e.table_name,
    e.keeper_index,
    e.dup_name AS duplicate_index,
    e.index_definition,
    e.dup_size AS size_bytes,
    format('DROP INDEX IF EXISTS %I.%I;', e.schema_name, e.dup_name) AS recommendation
  FROM expanded e
  ORDER BY e.table_name, e.keeper_index;
END;
$$;

REVOKE ALL ON FUNCTION public.get_duplicate_indexes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_duplicate_indexes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_duplicate_indexes() TO service_role;

COMMENT ON FUNCTION public.get_duplicate_indexes() IS
'Onda 97 — Lista índices com definição idêntica no schema public. Restrito a admins.';