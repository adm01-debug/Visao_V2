-- Onda 69: Índices alinhados às queries reais (user_id + timestamp DESC)
-- Baseado em pg_stat_statements: top 2 hotspots do PostgREST filtram por timestamp,
-- não por created_at, então os índices existentes idx_*_user_created não cobrem.

CREATE INDEX IF NOT EXISTS idx_alerts_user_timestamp
  ON public.alerts (user_id, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_history_user_timestamp
  ON public.analysis_history (user_id, "timestamp" DESC);

ANALYZE public.alerts;
ANALYZE public.analysis_history;