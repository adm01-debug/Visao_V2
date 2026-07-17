CREATE OR REPLACE FUNCTION public.get_definer_functions_without_search_path()
RETURNS TABLE(
  schema_name text,
  function_name text,
  arguments text,
  language text,
  search_path_config text,
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
  WITH raw AS (
    SELECT
      n.nspname::text AS schema_name,
      p.proname::text AS function_name,
      pg_get_function_identity_arguments(p.oid)::text AS arguments,
      l.lanname::text AS language,
      (
        SELECT string_agg(cfg, ', ')
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
      ) AS sp_cfg
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
    WHERE p.prosecdef = true
      AND n.nspname = 'public'
  )
  SELECT
    r.schema_name,
    r.function_name,
    r.arguments,
    r.language,
    COALESCE(r.sp_cfg, '∅') AS search_path_config,
    CASE
      WHEN r.sp_cfg IS NULL THEN 'critical'
      WHEN r.sp_cfg NOT ILIKE '%pg_catalog%' THEN 'warn'
      ELSE 'info'
    END::text AS severity,
    CASE
      WHEN r.sp_cfg IS NULL THEN
        format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_catalog;',
               r.schema_name, r.function_name, r.arguments)
      WHEN r.sp_cfg NOT ILIKE '%pg_catalog%' THEN
        format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_catalog;',
               r.schema_name, r.function_name, r.arguments)
      ELSE 'OK'
    END::text AS recommendation
  FROM raw r
  ORDER BY
    CASE WHEN r.sp_cfg IS NULL THEN 1
         WHEN r.sp_cfg NOT ILIKE '%pg_catalog%' THEN 2
         ELSE 3 END,
    r.function_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_definer_functions_without_search_path() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_definer_functions_without_search_path() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_definer_functions_without_search_path() TO service_role;

COMMENT ON FUNCTION public.get_definer_functions_without_search_path() IS
'Onda 96 — Lista funções SECURITY DEFINER no schema public sem search_path fixo. Restrito a admins.';