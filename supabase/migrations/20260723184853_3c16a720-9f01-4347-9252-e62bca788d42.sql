
CREATE TABLE public.firmware_fingerprint_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sha256 TEXT NOT NULL,
  size_bytes BIGINT,
  source TEXT NOT NULL CHECK (source IN ('upload','url','onvif-probe','client')),
  top_brand TEXT,
  top_profile_id TEXT,
  top_score NUMERIC(4,3),
  matched_count INTEGER NOT NULL DEFAULT 0,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.firmware_fingerprint_events TO authenticated;
GRANT ALL ON public.firmware_fingerprint_events TO service_role;

ALTER TABLE public.firmware_fingerprint_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own fingerprint events"
  ON public.firmware_fingerprint_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "service_role manages fingerprint events"
  ON public.firmware_fingerprint_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_firmware_fp_events_user_created
  ON public.firmware_fingerprint_events (user_id, created_at DESC);
CREATE INDEX idx_firmware_fp_events_sha256
  ON public.firmware_fingerprint_events (sha256);
