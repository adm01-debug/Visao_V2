CREATE OR REPLACE FUNCTION public.get_invalid_indexes()
RETURNS TABLE (
  schema_name text,
  table_name text,
  index_name text,
  is_unique boolean,
  is_ready boolean,
  is_live boolean,
  index_size_bytes bigint,
  index_size_pretty text,
  severity text,
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  RETURN QUERY
  SELECT
    n.nspname::text,
    c.relname::text,
    i.relname::text,
    ix.indisunique,
    ix.indisready,
    ix.indislive,
    pg_relation_size(i.oid)::bigint,
    pg_size_pretty(pg_relation_size(i.oid))::text,
    CASE
      WHEN ix.indisunique THEN 'critical'
      WHEN NOT ix.indisready THEN 'critical'
      ELSE 'warning'
    END::text,
    CASE
      WHEN ix.indisunique THEN
        format('REINDEX INDEX CONCURRENTLY %I.%I; -- UNIQUE inválido: constraint não é aplicada', n.nspname, i.relname)
      ELSE
        format('REINDEX INDEX CONCURRENTLY %I.%I; -- ou DROP INDEX CONCURRENTLY se não for mais necessário', n.nspname, i.relname)
    END::text
  FROM pg_index ix
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_class c ON c.oid = ix.indrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    AND (ix.indisvalid = false OR ix.indisready = false OR ix.indislive = false)
  ORDER BY
    CASE WHEN ix.indisunique THEN 0 ELSE 1 END,
    pg_relation_size(i.oid) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_invalid_indexes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_invalid_indexes() TO authenticated;