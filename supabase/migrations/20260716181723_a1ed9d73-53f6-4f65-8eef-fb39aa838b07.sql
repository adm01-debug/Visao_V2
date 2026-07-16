
ALTER TABLE public.query_telemetry ADD COLUMN IF NOT EXISTS query_type text;
ALTER TABLE public.query_telemetry ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.query_telemetry ALTER COLUMN user_id DROP NOT NULL;

-- Índice parcial otimizado para get_operational_metrics()
CREATE INDEX IF NOT EXISTS idx_query_telemetry_edge_cache_recent
  ON public.query_telemetry (created_at DESC, query_type)
  WHERE table_name = 'edge_cache' AND metadata IS NOT NULL;

-- Ajustar RLS: permitir inserts de telemetria de sistema (user_id IS NULL) apenas via service_role
DROP POLICY IF EXISTS "Users can insert their own telemetry" ON public.query_telemetry;
CREATE POLICY "Users can insert their own telemetry"
  ON public.query_telemetry FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
