ALTER TABLE public.camera_ptz_config
  ADD COLUMN IF NOT EXISTS calibration JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.camera_ptz_config.calibration IS
  'Sweep real medido via ONVIF GetStatus por eixo: {pan|tilt|zoom: {sweep_ms, min_reported, max_reported, measured_at}}';