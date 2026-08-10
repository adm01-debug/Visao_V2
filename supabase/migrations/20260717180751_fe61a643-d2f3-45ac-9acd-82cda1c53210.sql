CREATE OR REPLACE FUNCTION public.get_permissive_rls_policies()
RETURNS TABLE(
  schemaname text,
  tablename text,
  policyname text,
  cmd text,
  roles text[],
  qual text,
  with_check text,
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
    p.schemaname::text,
    p.tablename::text,
    p.policyname::text,
    p.cmd::text,
    p.roles::text[],
    COALESCE(p.qual, '')::text AS qual,
    COALESCE(p.with_check, '')::text AS with_check,
    CASE
      WHEN p.qual = 'true' AND ('anon' = ANY(p.roles) OR 'public' = ANY(p.roles)) THEN 'critical'
      WHEN p.qual = 'true' AND p.tablename IN ('user_roles','audit_logs','csp_violation_reports','profiles') THEN 'critical'
      WHEN p.qual = 'true' THEN 'warn'
      WHEN p.qual IS NULL AND p.cmd <> 'SELECT' THEN 'warn'
      ELSE 'info'
    END::text AS severity,
    CASE
      WHEN p.qual = 'true' THEN 'Substituir USING (true) por filtro baseado em auth.uid() ou has_role()'
      WHEN p.qual IS NULL THEN 'Adicionar cláusula USING explícita'
      ELSE 'Revisar necessidade da política'
    END::text AS recommendation
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND (
      p.qual = 'true'
      OR p.qual IS NULL
      OR p.with_check = 'true'
    )
  ORDER BY
    CASE
      WHEN p.qual = 'true' AND ('anon' = ANY(p.roles) OR 'public' = ANY(p.roles)) THEN 1
      WHEN p.qual = 'true' AND p.tablename IN ('user_roles','audit_logs','csp_violation_reports','profiles') THEN 2
      WHEN p.qual = 'true' THEN 3
      ELSE 4
    END,
    p.tablename,
    p.policyname;
END;
$$;

REVOKE ALL ON FUNCTION public.get_permissive_rls_policies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_permissive_rls_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_permissive_rls_policies() TO service_role;

COMMENT ON FUNCTION public.get_permissive_rls_policies() IS
'Onda 95 — Retorna políticas RLS permissivas (USING true / sem qual) no schema public. Restrito a admins.';