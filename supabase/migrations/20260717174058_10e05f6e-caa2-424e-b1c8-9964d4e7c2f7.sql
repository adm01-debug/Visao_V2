
CREATE OR REPLACE FUNCTION public.get_autovacuum_overrides()
RETURNS TABLE (
  schema_name text,
  table_name text,
  reloptions text[],
  autovacuum_enabled_override boolean,
  scale_factor_override numeric,
  threshold_override bigint,
  n_live_tuples bigint,
  n_dead_tuples bigint,
  dead_pct numeric,
  last_autovacuum timestamptz,
  last_vacuum timestamptz,
  total_size_bytes bigint,
  total_size_pretty text,
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
  WITH t AS (
    SELECT
      n.nspname::text AS schema_name,
      c.relname::text AS table_name,
      c.oid AS relid,
      c.reloptions,
      pg_total_relation_size(c.oid) AS total_size_bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r','p')
      AND n.nspname = 'public'
  ),
  parsed AS (
    SELECT
      t.*,
      (SELECT (regexp_match(opt, '^autovacuum_enabled=(.*)$'))[1]
         FROM unnest(coalesce(t.reloptions, ARRAY[]::text[])) opt
        WHERE opt LIKE 'autovacuum_enabled=%') AS av_enabled_raw,
      (SELECT (regexp_match(opt, '^autovacuum_vacuum_scale_factor=(.*)$'))[1]::numeric
         FROM unnest(coalesce(t.reloptions, ARRAY[]::text[])) opt
        WHERE opt LIKE 'autovacuum_vacuum_scale_factor=%') AS scale_override,
      (SELECT (regexp_match(opt, '^autovacuum_vacuum_threshold=(.*)$'))[1]::bigint
         FROM unnest(coalesce(t.reloptions, ARRAY[]::text[])) opt
        WHERE opt LIKE 'autovacuum_vacuum_threshold=%') AS threshold_override
    FROM t
  ),
  stats AS (
    SELECT p.*, s.n_live_tup, s.n_dead_tup, s.last_autovacuum, s.last_vacuum
    FROM parsed p
    LEFT JOIN pg_stat_all_tables s ON s.relid = p.relid
  )
  SELECT
    s.schema_name,
    s.table_name,
    s.reloptions,
    CASE WHEN s.av_enabled_raw IS NULL THEN NULL ELSE (s.av_enabled_raw ILIKE 'true' OR s.av_enabled_raw = '1') END AS autovacuum_enabled_override,
    s.scale_override AS scale_factor_override,
    s.threshold_override AS threshold_override,
    coalesce(s.n_live_tup, 0)::bigint AS n_live_tuples,
    coalesce(s.n_dead_tup, 0)::bigint AS n_dead_tuples,
    CASE WHEN coalesce(s.n_live_tup, 0) = 0 THEN 0
         ELSE round((s.n_dead_tup::numeric / s.n_live_tup) * 100, 2)
    END AS dead_pct,
    s.last_autovacuum,
    s.last_vacuum,
    s.total_size_bytes,
    pg_size_pretty(s.total_size_bytes) AS total_size_pretty,
    CASE
      WHEN s.av_enabled_raw IS NOT NULL AND NOT (s.av_enabled_raw ILIKE 'true' OR s.av_enabled_raw = '1')
           AND coalesce(s.n_dead_tup, 0) > 10000 THEN 'critical'
      WHEN s.av_enabled_raw IS NOT NULL AND NOT (s.av_enabled_raw ILIKE 'true' OR s.av_enabled_raw = '1') THEN 'warning'
      WHEN s.scale_override IS NOT NULL AND s.scale_override = 0 AND s.threshold_override IS NULL THEN 'warning'
      WHEN s.reloptions IS NOT NULL THEN 'info'
      ELSE 'ok'
    END AS severity,
    CASE
      WHEN s.av_enabled_raw IS NOT NULL AND NOT (s.av_enabled_raw ILIKE 'true' OR s.av_enabled_raw = '1')
           AND coalesce(s.n_dead_tup, 0) > 10000 THEN
        'Autovacuum DESLIGADO e há acúmulo de dead tuples — reativar ou executar VACUUM manual imediatamente.'
      WHEN s.av_enabled_raw IS NOT NULL AND NOT (s.av_enabled_raw ILIKE 'true' OR s.av_enabled_raw = '1') THEN
        'Autovacuum desativado nesta tabela — validar se é intencional (bulk load, staging).'
      WHEN s.scale_override IS NOT NULL AND s.scale_override = 0 AND s.threshold_override IS NULL THEN
        'scale_factor=0 sem threshold explícito — pode disparar vacuum constantemente. Definir autovacuum_vacuum_threshold.'
      WHEN s.reloptions IS NOT NULL THEN 'Override presente — revisar se ainda faz sentido.'
      ELSE 'Configuração padrão.'
    END AS recommendation
  FROM stats s
  WHERE s.reloptions IS NOT NULL
  ORDER BY s.total_size_bytes DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_autovacuum_overrides() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_autovacuum_overrides() TO authenticated;
