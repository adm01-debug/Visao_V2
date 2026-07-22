
ALTER TABLE public.stream_health_checks
  ADD COLUMN IF NOT EXISTS score TEXT CHECK (score IN ('ok','warn','critical'));

CREATE INDEX IF NOT EXISTS idx_stream_health_checks_camera_created
  ON public.stream_health_checks (camera_id, created_at DESC);

ALTER TABLE public.camera_health_state
  ADD COLUMN IF NOT EXISTS last_critical_alert_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consecutive_critical_scores INTEGER NOT NULL DEFAULT 0;
