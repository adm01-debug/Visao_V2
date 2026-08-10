CREATE OR REPLACE FUNCTION public.get_maintenance_progress()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  vacuums jsonb;
  analyzes jsonb;
  autov_workers int;
  autov_max int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(v) ORDER BY v.started_at), '[]'::jsonb) INTO vacuums FROM (
    SELECT
      p.pid,
      p.datname::text,
      c.relname::text AS relation,
      p.phase::text,
      p.heap_blks_total,
      p.heap_blks_scanned,
      p.heap_blks_vacuumed,
      p.index_vacuum_count,
      p.max_dead_tuples,
      p.num_dead_tuples,
      CASE WHEN p.heap_blks_total > 0
        THEN ROUND(100.0 * p.heap_blks_scanned::numeric / p.heap_blks_total, 2)
        ELSE NULL END AS scan_pct,
      a.query_start AS started_at,
      ROUND(EXTRACT(EPOCH FROM (now() - a.query_start))::numeric, 1) AS runtime_secs,
      a.usename::text AS usename,
      CASE WHEN a.backend_type = 'autovacuum worker' THEN true ELSE false END AS is_autovacuum
    FROM pg_stat_progress_vacuum p
    LEFT JOIN pg_class c ON c.oid = p.relid
    LEFT JOIN pg_stat_activity a ON a.pid = p.pid
    ORDER BY a.query_start NULLS LAST
    LIMIT 50
  ) v;

  SELECT COALESCE(jsonb_agg(row_to_json(x) ORDER BY x.started_at), '[]'::jsonb) INTO analyzes FROM (
    SELECT
      p.pid,
      p.datname::text,
      c.relname::text AS relation,
      p.phase::text,
      p.sample_blks_total,
      p.sample_blks_scanned,
      CASE WHEN p.sample_blks_total > 0
        THEN ROUND(100.0 * p.sample_blks_scanned::numeric / p.sample_blks_total, 2)
        ELSE NULL END AS scan_pct,
      a.query_start AS started_at,
      ROUND(EXTRACT(EPOCH FROM (now() - a.query_start))::numeric, 1) AS runtime_secs,
      a.usename::text AS usename,
      CASE WHEN a.backend_type = 'autovacuum worker' THEN true ELSE false END AS is_autovacuum
    FROM pg_stat_progress_analyze p
    LEFT JOIN pg_class c ON c.oid = p.relid
    LEFT JOIN pg_stat_activity a ON a.pid = p.pid
    ORDER BY a.query_start NULLS LAST
    LIMIT 50
  ) x;

  SELECT COUNT(*)::int INTO autov_workers
  FROM pg_stat_activity WHERE backend_type = 'autovacuum worker';

  SELECT setting::int INTO autov_max FROM pg_settings WHERE name = 'autovacuum_max_workers';

  RETURN jsonb_build_object(
    'vacuums', vacuums,
    'analyzes', analyzes,
    'autovacuum_workers_active', autov_workers,
    'autovacuum_max_workers', autov_max,
    'workers_saturation_pct', CASE WHEN autov_max > 0
      THEN ROUND(100.0 * autov_workers::numeric / autov_max, 1)
      ELSE 0 END,
    'generated_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_maintenance_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_maintenance_progress() TO authenticated, service_role;