
CREATE OR REPLACE FUNCTION public.get_nullable_foreign_keys()
RETURNS TABLE (
  schema_name text,
  table_name text,
  constraint_name text,
  column_name text,
  referenced_table text,
  referenced_column text,
  on_delete_action text,
  table_size_bytes bigint,
  table_size_pretty text,
  estimated_rows bigint,
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
  WITH fk AS (
    SELECT
      n.nspname::text AS schema_name,
      c.relname::text AS table_name,
      con.conname::text AS constraint_name,
      att.attname::text AS column_name,
      att.attnotnull AS not_null,
      rn.nspname::text AS ref_schema,
      rc.relname::text AS referenced_table,
      ratt.attname::text AS referenced_column,
      CASE con.confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
      END AS on_delete_action,
      c.oid AS relid
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class rc ON rc.oid = con.confrelid
    JOIN pg_namespace rn ON rn.oid = rc.relnamespace
    JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
    JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS rk(attnum, ord) ON rk.ord = ck.ord
    JOIN pg_attribute att ON att.attrelid = c.oid AND att.attnum = ck.attnum
    JOIN pg_attribute ratt ON ratt.attrelid = rc.oid AND ratt.attnum = rk.attnum
    WHERE con.contype = 'f'
      AND n.nspname = 'public'
  )
  SELECT
    fk.schema_name,
    fk.table_name,
    fk.constraint_name,
    fk.column_name,
    fk.referenced_table,
    fk.referenced_column,
    fk.on_delete_action,
    pg_total_relation_size(fk.relid) AS table_size_bytes,
    pg_size_pretty(pg_total_relation_size(fk.relid)) AS table_size_pretty,
    (SELECT reltuples::bigint FROM pg_class WHERE oid = fk.relid) AS estimated_rows,
    CASE
      WHEN fk.not_null THEN 'ok'
      WHEN fk.on_delete_action = 'SET NULL' THEN 'info'
      WHEN fk.column_name IN ('user_id','organization_id','tenant_id','owner_id')
           AND pg_total_relation_size(fk.relid) > 10 * 1024 * 1024 THEN 'critical'
      WHEN pg_total_relation_size(fk.relid) > 100 * 1024 * 1024 THEN 'critical'
      ELSE 'warning'
    END AS severity,
    CASE
      WHEN fk.not_null THEN 'Coluna já é NOT NULL.'
      WHEN fk.on_delete_action = 'SET NULL' THEN 'Nullable exigido pela regra ON DELETE SET NULL — comportamento intencional.'
      WHEN fk.column_name IN ('user_id','organization_id','tenant_id','owner_id') THEN
        'Coluna de isolamento sem NOT NULL — risco de vazamento entre tenants/usuários. Adicionar NOT NULL.'
      ELSE 'Considerar ALTER COLUMN ... SET NOT NULL para reforçar integridade referencial.'
    END AS recommendation
  FROM fk
  WHERE NOT fk.not_null
  ORDER BY pg_total_relation_size(fk.relid) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_nullable_foreign_keys() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_nullable_foreign_keys() TO authenticated;
