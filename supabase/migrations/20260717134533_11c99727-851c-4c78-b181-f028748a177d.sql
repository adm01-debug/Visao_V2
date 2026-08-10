
CREATE OR REPLACE FUNCTION public.get_duplicate_indexes()
RETURNS TABLE(
  schema_name text,
  table_name text,
  index_a text,
  index_b text,
  size_a_pretty text,
  size_b_pretty text,
  relation text,
  a_is_unique boolean,
  b_is_unique boolean,
  suggestion text
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
  WITH idx AS (
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      ic.relname AS index_name,
      i.indexrelid,
      i.indrelid,
      i.indkey::int2[] AS cols,
      i.indisunique AS is_unique,
      i.indpred IS NOT NULL AS is_partial,
      pg_relation_size(i.indexrelid) AS size_bytes
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND NOT i.indisprimary
      AND NOT i.indpred IS NOT NULL
  )
  SELECT
    a.schema_name::text,
    a.table_name::text,
    a.index_name::text AS index_a,
    b.index_name::text AS index_b,
    pg_size_pretty(a.size_bytes)::text,
    pg_size_pretty(b.size_bytes)::text,
    CASE
      WHEN a.cols = b.cols THEN 'identical'
      ELSE 'prefix'
    END::text AS relation,
    a.is_unique,
    b.is_unique,
    CASE
      WHEN a.cols = b.cols AND NOT a.is_unique THEN format('DROP INDEX public.%I;', a.index_name)
      WHEN a.cols = b.cols AND NOT b.is_unique THEN format('DROP INDEX public.%I;', b.index_name)
      WHEN a.cols = b.cols THEN '-- ambos UNIQUE: revisar manualmente'
      WHEN NOT a.is_unique THEN format('-- %I é prefixo de %I; considere DROP INDEX public.%I;', a.index_name, b.index_name, a.index_name)
      ELSE '-- avaliar: prefixo é UNIQUE'
    END::text AS suggestion
  FROM idx a
  JOIN idx b
    ON a.indrelid = b.indrelid
   AND a.indexrelid < b.indexrelid
   AND (
        a.cols = b.cols
     OR a.cols = b.cols[1:array_length(a.cols, 1)]
   )
  ORDER BY a.size_bytes + b.size_bytes DESC
  LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.get_duplicate_indexes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_duplicate_indexes() TO authenticated, service_role;
