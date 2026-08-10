
CREATE OR REPLACE FUNCTION public.get_table_bloat_stats(_min_dead_rows bigint DEFAULT 1000)
RETURNS TABLE(
  schema_name text,
  table_name text,
  live_rows bigint,
  dead_rows bigint,
  dead_ratio_pct numeric,
  last_vacuum timestamptz,
  last_autovacuum timestamptz,
  last_analyze timestamptz,
  last_autoanalyze timestamptz,
  n_mod_since_analyze bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    s.schemaname::text,
    s.relname::text,
    s.n_live_tup::bigint,
    s.n_dead_tup::bigint,
    CASE WHEN (s.n_live_tup + s.n_dead_tup) > 0
      THEN ROUND(100.0 * s.n_dead_tup::numeric / (s.n_live_tup + s.n_dead_tup), 2)
      ELSE 0 END,
    s.last_vacuum,
    s.last_autovacuum,
    s.last_analyze,
    s.last_autoanalyze,
    s.n_mod_since_analyze::bigint
  FROM pg_stat_user_tables s
  WHERE s.schemaname = 'public'
    AND s.n_dead_tup >= COALESCE(_min_dead_rows, 1000)
  ORDER BY s.n_dead_tup DESC
  LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.get_table_bloat_stats(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_table_bloat_stats(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.run_selective_vacuum(_max_tables int DEFAULT 5, _min_dead_ratio numeric DEFAULT 20.0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  results jsonb := '[]'::jsonb;
  rec record;
  err_msg text;
  processed int := 0;
  cap int;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  cap := LEAST(GREATEST(COALESCE(_max_tables, 5), 1), 10);

  FOR rec IN
    SELECT schemaname, relname, n_dead_tup,
           CASE WHEN (n_live_tup + n_dead_tup) > 0
             THEN 100.0 * n_dead_tup::numeric / (n_live_tup + n_dead_tup)
             ELSE 0 END AS ratio
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND n_dead_tup >= 1000
    ORDER BY n_dead_tup DESC
    LIMIT cap
  LOOP
    IF rec.ratio < COALESCE(_min_dead_ratio, 20.0) THEN
      CONTINUE;
    END IF;
    BEGIN
      EXECUTE format('VACUUM (ANALYZE) %I.%I', rec.schemaname, rec.relname);
      results := results || jsonb_build_object(
        'table', rec.schemaname || '.' || rec.relname,
        'dead_rows', rec.n_dead_tup,
        'ratio_pct', ROUND(rec.ratio, 2),
        'status', 'ok'
      );
      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      results := results || jsonb_build_object(
        'table', rec.schemaname || '.' || rec.relname,
        'status', 'error',
        'error', err_msg
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ran_at', now(),
    'processed', processed,
    'results', results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_selective_vacuum(int, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_selective_vacuum(int, numeric) TO service_role;

-- Agendar VACUUM seletivo semanal (domingo 03:15 UTC)
DO $$
BEGIN
  PERFORM cron.unschedule('visao-weekly-selective-vacuum')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'visao-weekly-selective-vacuum');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'visao-weekly-selective-vacuum',
  '15 3 * * 0',
  $$SELECT public.run_selective_vacuum(5, 20.0);$$
);
