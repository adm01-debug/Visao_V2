
CREATE OR REPLACE FUNCTION public.get_stats_staleness(_min_mod_since bigint DEFAULT 1000)
RETURNS TABLE(
  schema_name text,
  table_name text,
  n_live_tup bigint,
  n_mod_since_analyze bigint,
  mod_ratio_pct numeric,
  last_analyze timestamptz,
  last_autoanalyze timestamptz,
  hours_since_analyze numeric,
  severity text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
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
    s.n_mod_since_analyze::bigint,
    CASE WHEN s.n_live_tup > 0
      THEN ROUND(100.0 * s.n_mod_since_analyze::numeric / s.n_live_tup, 2)
      ELSE NULL END,
    s.last_analyze,
    s.last_autoanalyze,
    CASE
      WHEN GREATEST(s.last_analyze, s.last_autoanalyze) IS NULL THEN NULL
      ELSE ROUND(EXTRACT(EPOCH FROM (now() - GREATEST(s.last_analyze, s.last_autoanalyze))) / 3600, 1)
    END,
    CASE
      WHEN s.n_live_tup > 0 AND s.n_mod_since_analyze > s.n_live_tup * 0.5 THEN 'critical'
      WHEN s.n_live_tup > 0 AND s.n_mod_since_analyze > s.n_live_tup * 0.2 THEN 'warning'
      WHEN GREATEST(s.last_analyze, s.last_autoanalyze) IS NULL THEN 'never'
      ELSE 'info'
    END
  FROM pg_stat_user_tables s
  WHERE s.schemaname = 'public'
    AND s.n_mod_since_analyze >= COALESCE(_min_mod_since, 1000)
  ORDER BY s.n_mod_since_analyze DESC
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.analyze_table(_table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_name text;
  started_at timestamptz := clock_timestamp();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  -- Whitelist: apenas tabelas do schema public que existam
  IF _table_name IS NULL OR _table_name !~ '^[a-z_][a-z0-9_]{0,62}$' THEN
    RAISE EXCEPTION 'Nome de tabela inválido' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = _table_name AND c.relkind IN ('r','p')
  ) THEN
    RAISE EXCEPTION 'Tabela public.% não encontrada', _table_name USING ERRCODE = '42P01';
  END IF;

  safe_name := format('public.%I', _table_name);
  EXECUTE 'ANALYZE ' || safe_name;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
  VALUES (auth.uid(), 'admin.analyze_table', 'pg_class', gen_random_uuid(),
          jsonb_build_object('table', _table_name,
                             'duration_ms', ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000, 1)));

  RETURN jsonb_build_object(
    'ok', true,
    'table', _table_name,
    'duration_ms', ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000, 1),
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_stats_staleness(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_stats_staleness(bigint) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.analyze_table(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analyze_table(text) TO authenticated, service_role;
