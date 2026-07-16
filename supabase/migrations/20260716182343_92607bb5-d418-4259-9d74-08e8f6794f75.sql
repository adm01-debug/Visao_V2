
CREATE OR REPLACE FUNCTION public.system_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  cron_ok boolean := false;
  jobs_active int := 0;
  cache_rows bigint := 0;
  result jsonb;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO jobs_active
    FROM cron.job WHERE jobname LIKE 'visao-%' AND active = true;
    cron_ok := jobs_active >= 2;
  EXCEPTION WHEN OTHERS THEN
    cron_ok := false;
  END;

  BEGIN
    SELECT COUNT(*) INTO cache_rows FROM public.edge_cache LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    cache_rows := -1;
  END;

  result := jsonb_build_object(
    'status', CASE WHEN cron_ok AND cache_rows >= 0 THEN 'healthy'
                   WHEN cache_rows >= 0 THEN 'degraded'
                   ELSE 'unhealthy' END,
    'db', 'ok',
    'cron_jobs_active', jobs_active,
    'cache_accessible', cache_rows >= 0,
    'checked_at', now()
  );
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.system_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_health() TO service_role;
