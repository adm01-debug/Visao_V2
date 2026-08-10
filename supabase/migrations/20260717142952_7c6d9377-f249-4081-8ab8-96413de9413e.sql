CREATE OR REPLACE FUNCTION public.audit_rls_coverage()
RETURNS TABLE(
  schema_name text,
  table_name text,
  rls_enabled boolean,
  rls_forced boolean,
  is_partition boolean,
  total_policies integer,
  select_policies integer,
  insert_policies integer,
  update_policies integer,
  delete_policies integer,
  all_policies integer,
  severity text,
  finding text
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
  WITH tables AS (
    SELECT
      n.nspname::text AS schema_name,
      c.relname::text AS table_name,
      c.oid AS relid,
      c.relrowsecurity AS rls_enabled,
      c.relforcerowsecurity AS rls_forced,
      c.relispartition AS is_partition
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
  ),
  policy_counts AS (
    SELECT
      c.oid AS relid,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE p.polcmd = 'r')::int AS sel,
      COUNT(*) FILTER (WHERE p.polcmd = 'a')::int AS ins,
      COUNT(*) FILTER (WHERE p.polcmd = 'w')::int AS upd,
      COUNT(*) FILTER (WHERE p.polcmd = 'd')::int AS del,
      COUNT(*) FILTER (WHERE p.polcmd = '*')::int AS all_cmd
    FROM pg_class c
    LEFT JOIN pg_policy p ON p.polrelid = c.oid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    GROUP BY c.oid
  )
  SELECT
    t.schema_name,
    t.table_name,
    t.rls_enabled,
    t.rls_forced,
    t.is_partition,
    COALESCE(pc.total, 0),
    COALESCE(pc.sel, 0),
    COALESCE(pc.ins, 0),
    COALESCE(pc.upd, 0),
    COALESCE(pc.del, 0),
    COALESCE(pc.all_cmd, 0),
    CASE
      WHEN NOT t.rls_enabled AND NOT t.is_partition THEN 'critical'
      WHEN t.rls_enabled AND COALESCE(pc.total, 0) = 0 AND NOT t.is_partition THEN 'warning'
      WHEN t.rls_enabled AND COALESCE(pc.all_cmd, 0) = 0
           AND (COALESCE(pc.sel, 0) = 0 OR COALESCE(pc.ins, 0) = 0
                OR COALESCE(pc.upd, 0) = 0 OR COALESCE(pc.del, 0) = 0)
           AND NOT t.is_partition
        THEN 'info'
      ELSE 'ok'
    END AS severity,
    CASE
      WHEN NOT t.rls_enabled AND NOT t.is_partition
        THEN 'RLS desativado — tabela exposta a qualquer usuário via API.'
      WHEN t.rls_enabled AND COALESCE(pc.total, 0) = 0 AND NOT t.is_partition
        THEN 'RLS ativo sem políticas — todas as operações são bloqueadas silenciosamente.'
      WHEN t.is_partition
        THEN 'Partição herda RLS do pai.'
      WHEN t.rls_enabled AND COALESCE(pc.all_cmd, 0) = 0
           AND (COALESCE(pc.sel, 0) = 0 OR COALESCE(pc.ins, 0) = 0
                OR COALESCE(pc.upd, 0) = 0 OR COALESCE(pc.del, 0) = 0)
        THEN 'Cobertura parcial — verificar se comandos sem policy são intencionais.'
      ELSE 'OK.'
    END AS finding
  FROM tables t
  LEFT JOIN policy_counts pc ON pc.relid = t.relid
  ORDER BY
    CASE
      WHEN NOT t.rls_enabled AND NOT t.is_partition THEN 0
      WHEN t.rls_enabled AND COALESCE(pc.total, 0) = 0 AND NOT t.is_partition THEN 1
      ELSE 2
    END,
    t.table_name;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_rls_coverage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_rls_coverage() TO authenticated, service_role;

COMMENT ON FUNCTION public.audit_rls_coverage() IS
'Onda 88: Auditor de cobertura RLS em tabelas do schema public. Admin-only.';