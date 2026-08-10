CREATE OR REPLACE FUNCTION public.get_seq_scan_hotspots(_min_size_mb integer DEFAULT 5, _min_seq_scans bigint DEFAULT 100)
RETURNS TABLE(
  schema_name text,
  table_name text,
  seq_scan bigint,
  seq_tup_read bigint,
  idx_scan bigint,
  idx_tup_fetch bigint,
  seq_ratio_pct numeric,
  avg_rows_per_seq_scan numeric,
  table_size_bytes bigint,
  table_size_pretty text,
  n_live_tup bigint,
  severity text,
  recommendation text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    s.schemaname::text,
    s.relname::text,
    s.seq_scan::bigint,
    s.seq_tup_read::bigint,
    COALESCE(s.idx_scan, 0)::bigint,
    COALESCE(s.idx_tup_fetch, 0)::bigint,
    CASE WHEN (s.seq_scan + COALESCE(s.idx_scan, 0)) > 0
      THEN ROUND(100.0 * s.seq_scan::numeric / (s.seq_scan + COALESCE(s.idx_scan, 0)), 2)
      ELSE NULL END AS seq_ratio_pct,
    CASE WHEN s.seq_scan > 0
      THEN ROUND(s.seq_tup_read::numeric / s.seq_scan, 1)
      ELSE 0 END AS avg_rows_per_seq_scan,
    pg_relation_size(s.relid)::bigint AS table_size_bytes,
    pg_size_pretty(pg_relation_size(s.relid))::text AS table_size_pretty,
    s.n_live_tup::bigint,
    CASE
      WHEN pg_relation_size(s.relid) > 50 * 1024 * 1024
           AND s.seq_scan > COALESCE(s.idx_scan, 0) * 9
           AND s.seq_tup_read > 1000000 THEN 'critical'
      WHEN pg_relation_size(s.relid) > 10 * 1024 * 1024
           AND s.seq_scan > COALESCE(s.idx_scan, 0) * 3 THEN 'warning'
      WHEN s.seq_scan > COALESCE(s.idx_scan, 0) THEN 'info'
      ELSE 'ok'
    END AS severity,
    CASE
      WHEN pg_relation_size(s.relid) > 50 * 1024 * 1024
           AND s.seq_scan > COALESCE(s.idx_scan, 0) * 9
        THEN 'Prioridade alta: adicionar índice. Rode EXPLAIN ANALYZE em queries frequentes desta tabela.'
      WHEN pg_relation_size(s.relid) > 10 * 1024 * 1024
           AND s.seq_scan > COALESCE(s.idx_scan, 0) * 3
        THEN 'Investigar padrão de WHERE mais comum e criar índice específico.'
      WHEN COALESCE(s.idx_scan, 0) = 0 AND s.seq_scan > 1000
        THEN 'Nenhum índice usado — verificar se PK/FK cobrem os filtros da aplicação.'
      ELSE 'Monitorar; nenhuma ação imediata.'
    END AS recommendation
  FROM pg_stat_user_tables s
  WHERE s.schemaname = 'public'
    AND pg_relation_size(s.relid) >= (COALESCE(_min_size_mb, 5) * 1024 * 1024)
    AND s.seq_scan >= COALESCE(_min_seq_scans, 100)
    AND s.relname NOT LIKE '%_m20%'
    AND s.relname NOT LIKE '%_y20%'
  ORDER BY
    CASE
      WHEN pg_relation_size(s.relid) > 50 * 1024 * 1024
           AND s.seq_scan > COALESCE(s.idx_scan, 0) * 9 THEN 1
      WHEN pg_relation_size(s.relid) > 10 * 1024 * 1024
           AND s.seq_scan > COALESCE(s.idx_scan, 0) * 3 THEN 2
      ELSE 3
    END,
    s.seq_tup_read DESC
  LIMIT 30;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_seq_scan_hotspots(integer, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_seq_scan_hotspots(integer, bigint) TO authenticated, service_role;