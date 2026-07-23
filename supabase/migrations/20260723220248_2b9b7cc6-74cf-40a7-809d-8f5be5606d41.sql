CREATE TABLE public.ptz_preflight_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL,
  axis TEXT NOT NULL CHECK (axis IN ('pan','tilt','zoom')),
  ack_area_clear BOOLEAN NOT NULL DEFAULT false,
  ack_watching_live BOOLEAN NOT NULL DEFAULT false,
  ack_confirmed_at TIMESTAMPTZ,
  outcome TEXT NOT NULL CHECK (outcome IN ('ok','deviation','fail','aborted','no-telemetry')),
  aborted BOOLEAN NOT NULL DEFAULT false,
  status_supported BOOLEAN NOT NULL DEFAULT false,
  phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  limits_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ptz_preflight_runs_camera_axis
  ON public.ptz_preflight_runs (camera_id, axis, created_at DESC);
CREATE INDEX idx_ptz_preflight_runs_user
  ON public.ptz_preflight_runs (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.ptz_preflight_runs TO authenticated;
GRANT ALL ON public.ptz_preflight_runs TO service_role;

ALTER TABLE public.ptz_preflight_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own preflight runs"
  ON public.ptz_preflight_runs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own preflight runs"
  ON public.ptz_preflight_runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);