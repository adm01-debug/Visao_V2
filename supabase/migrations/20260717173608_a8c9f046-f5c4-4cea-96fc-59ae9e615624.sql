
CREATE OR REPLACE FUNCTION public.get_tables_without_pk()
RETURNS TABLE (
  schema_name text,
  table_name text,
  total_size_bytes bigint,
  total_size_pretty text,
  estimated_rows bigint,
  has_unique_index boolean,
  replica_identity text,
  severity text,
  recommendation text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH candidate_tables AS (
    SELECT
      n.nspname::text AS schema_name,
      c.relname::text AS table_name,
      c.oid AS relid,
      pg_total_relation_size(c.oid) AS total_size_bytes,
      c.reltuples::bigint AS estimated_rows,
      CASE c.relreplident
        WHEN 'd' THEN 'default'
        WHEN 'n' THEN 'nothing'
        WHEN 'f' THEN 'full'
        WHEN 'i' THEN 'index'
        ELSE 'unknown'
      END AS replica_identity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        WHERE con.conrelid = c.oid AND con.contype = 'p'
      )
  ),
  with_unique AS (
    SELECT
      ct.*,
      EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = ct.relid
          AND i.indisunique
          AND NOT i.indisprimary
      ) AS has_unique_index
    FROM candidate_tables ct
  )
  SELECT
    wu.schema_name,
    wu.table_name,
    wu.total_size_bytes,
    pg_size_pretty(wu.total_size_bytes) AS total_size_pretty,
    wu.estimated_rows,
    wu.has_unique_index,
    wu.replica_identity,
    CASE
      WHEN wu.total_size_bytes > 100 * 1024 * 1024 AND NOT wu.has_unique_index THEN 'critical'
      WHEN NOT wu.has_unique_index THEN 'warning'
      ELSE 'info'
    END AS severity,
    CASE
      WHEN NOT wu.has_unique_index THEN 'Adicionar PRIMARY KEY (id BIGSERIAL) para permitir replicação lógica e updates seguros.'
      WHEN wu.replica_identity = 'default' THEN 'Definir PRIMARY KEY explícita — índice único existente não é usado por replicação lógica.'
      ELSE 'Considerar promover índice único a PRIMARY KEY.'
    END AS recommendation
  FROM with_unique wu
  ORDER BY wu.total_size_bytes DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_tables_without_pk() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tables_without_pk() TO authenticated;
