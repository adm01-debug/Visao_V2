
CREATE OR REPLACE FUNCTION public.get_disabled_triggers()
RETURNS TABLE (
  schema_name text,
  table_name text,
  trigger_name text,
  trigger_state text,
  trigger_kind text,
  function_name text,
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
    RAISE EXCEPTION 'access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    n.nspname::text,
    c.relname::text,
    t.tgname::text,
    CASE t.tgenabled
      WHEN 'O' THEN 'enabled'
      WHEN 'D' THEN 'disabled'
      WHEN 'R' THEN 'replica-only'
      WHEN 'A' THEN 'always'
    END::text,
    CASE
      WHEN t.tgisinternal THEN 'internal'
      WHEN t.tgconstraint <> 0 THEN 'constraint'
      ELSE 'user'
    END::text,
    (p.pronamespace::regnamespace || '.' || p.proname)::text,
    CASE
      WHEN t.tgenabled = 'D' AND NOT t.tgisinternal AND t.tgconstraint = 0
        AND (t.tgname ILIKE '%audit%' OR t.tgname ILIKE '%rls%'
             OR t.tgname ILIKE '%updated_at%' OR p.proname ILIKE '%audit%')
        THEN 'critical'
      WHEN t.tgenabled = 'D' AND NOT t.tgisinternal AND t.tgconstraint = 0
        THEN 'warning'
      WHEN t.tgenabled = 'R' AND NOT t.tgisinternal
        THEN 'warning'
      ELSE 'info'
    END::text,
    CASE
      WHEN t.tgenabled = 'D' THEN
        'ALTER TABLE ' || quote_ident(n.nspname) || '.' || quote_ident(c.relname)
        || ' ENABLE TRIGGER ' || quote_ident(t.tgname) || ';'
      WHEN t.tgenabled = 'R' THEN
        'Trigger só executa em replica; verifique se é intencional.'
      ELSE 'OK'
    END::text
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE n.nspname = 'public'
    AND t.tgenabled IN ('D','R')
    AND NOT t.tgisinternal
  ORDER BY
    CASE t.tgenabled WHEN 'D' THEN 0 WHEN 'R' THEN 1 ELSE 2 END,
    c.relname, t.tgname;
END;
$$;

REVOKE ALL ON FUNCTION public.get_disabled_triggers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_disabled_triggers() TO authenticated, service_role;
