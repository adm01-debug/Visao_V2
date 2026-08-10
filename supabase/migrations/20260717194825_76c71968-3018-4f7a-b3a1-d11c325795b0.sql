
CREATE TABLE IF NOT EXISTS public.storage_tiering_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier TEXT NOT NULL CHECK (tier IN ('hot_to_warm','warm_to_cold','orchestrator')),
  status TEXT NOT NULL CHECK (status IN ('started','success','failed','skipped_lock','skipped_cb','noop','timeout')),
  processed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.storage_tiering_runs TO authenticated;
GRANT ALL ON public.storage_tiering_runs TO service_role;

ALTER TABLE public.storage_tiering_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view tiering runs"
  ON public.storage_tiering_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages tiering runs"
  ON public.storage_tiering_runs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_storage_tiering_runs_tier_time
  ON public.storage_tiering_runs (tier, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_storage_tiering_runs_status_time
  ON public.storage_tiering_runs (status, started_at DESC);
