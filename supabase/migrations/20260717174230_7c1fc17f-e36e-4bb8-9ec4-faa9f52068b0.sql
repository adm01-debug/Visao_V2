
CREATE OR REPLACE FUNCTION public.get_unvalidated_constraints()
RETURNS TABLE (
  schema_name text,
  table_name text,
  constraint_name text,
  constraint_type text,
  definition text,
  total_size_bytes bigint,
  total_size_pretty text,
  severity text,
  validate_sql text,
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
  SELECT
    n.nspname::text AS schema_name,
    c.relname::text AS table_name,
    con.conname::text AS constraint_name,
    CASE con.contype WHEN 'c' THEN 'CHECK' WHEN 'f' THEN 'FOREIGN KEY' ELSE con.contype::text END AS constraint_type,
    pg_get_constraintdef(con.oid) AS definition,
    pg_total_relation_size(c.oid) AS total_size_bytes,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size_pretty,
    CASE
      WHEN pg_total_relation_size(c.oid) > 100 * 1024 * 1024 THEN 'critical'
      WHEN pg_total_relation_size(c.oid) > 10 * 1024 * 1024 THEN 'warning'
      ELSE 'info'
    END AS severity,
    format('ALTER TABLE %I.%I VALIDATE CONSTRAINT %I;', n.nspname, c.relname, con.conname) AS validate_sql,
    CASE
      WHEN pg_total_relation_size(c.oid) > 100 * 1024 * 1024 THEN
        'Tabela grande — executar VALIDATE em janela de manutenção (usa SHARE UPDATE EXCLUSIVE, permite reads/writes mas concorre com outros DDL).'
      ELSE 'Executar VALIDATE CONSTRAINT para promover a constraint a validada.'
    END AS recommendation
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE con.contype IN ('c','f')
    AND NOT con.convalidated
    AND n.nspname = 'public'
  ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_unvalidated_constraints() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unvalidated_constraints() TO authenticated;
