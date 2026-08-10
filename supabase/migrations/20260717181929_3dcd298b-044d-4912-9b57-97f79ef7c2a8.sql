
CREATE OR REPLACE FUNCTION public.get_missing_updated_at_triggers()
RETURNS TABLE (
  schema_name text,
  table_name text,
  column_name text,
  has_trigger boolean,
  is_partition boolean,
  severity text,
  recommendation text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH cols AS (
    SELECT n.nspname AS schema_name,
           c.relname AS table_name,
           a.attname AS column_name,
           c.oid    AS relid,
           (c.relispartition) AS is_partition
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r','p')
      AND a.attname = 'updated_at'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ),
  triggers AS (
    SELECT t.tgrelid,
           bool_or(
             t.tgtype & 2 = 2       -- BEFORE
             AND t.tgtype & 16 = 16 -- UPDATE
             AND t.tgenabled <> 'D'
             AND (
               p.proname ILIKE '%update%updated_at%'
               OR p.proname ILIKE '%set_updated_at%'
               OR p.proname = 'update_updated_at_column'
             )
           ) AS has_trigger
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal
    GROUP BY t.tgrelid
  )
  SELECT
    c.schema_name,
    c.table_name,
    c.column_name,
    COALESCE(tr.has_trigger, false) AS has_trigger,
    c.is_partition,
    CASE
      WHEN c.is_partition THEN 'info'
      WHEN c.table_name IN ('audit_logs','idempotency_keys','csp_violation_reports','api_usage_logs','query_telemetry','db_health_snapshots') THEN 'info'
      WHEN COALESCE(tr.has_trigger, false) THEN 'info'
      ELSE 'warning'
    END AS severity,
    CASE
      WHEN COALESCE(tr.has_trigger, false) THEN 'OK — trigger de updated_at ativo.'
      WHEN c.is_partition THEN 'Partição herda trigger da tabela pai.'
      ELSE format(
        'CREATE TRIGGER set_updated_at_%s BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
        c.table_name, c.schema_name, c.table_name
      )
    END AS recommendation
  FROM cols c
  LEFT JOIN triggers tr ON tr.tgrelid = c.relid
  WHERE NOT COALESCE(tr.has_trigger, false)
  ORDER BY severity DESC, c.table_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_missing_updated_at_triggers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_missing_updated_at_triggers() TO authenticated, service_role;
