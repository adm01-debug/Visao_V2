
-- Wave Sentinel 1 — Camera health monitoring state & cron
CREATE TABLE IF NOT EXISTS public.camera_health_state (
  camera_id UUID PRIMARY KEY REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  state TEXT NOT NULL DEFAULT 'unknown' CHECK (state IN ('online','degraded','offline','unknown')),
  consecutive_failures INT NOT NULL DEFAULT 0,
  consecutive_successes INT NOT NULL DEFAULT 0,
  last_check_at TIMESTAMPTZ,
  last_state_change_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_alert_at TIMESTAMPTZ,
  last_latency_ms INT,
  last_http_code INT,
  last_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.camera_health_state TO authenticated;
GRANT ALL ON public.camera_health_state TO service_role;

ALTER TABLE public.camera_health_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own camera health"
  ON public.camera_health_state
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_camera_health_state_user_state
  ON public.camera_health_state(user_id, state);

CREATE TRIGGER trg_camera_health_state_updated_at
  BEFORE UPDATE ON public.camera_health_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Retention/perf helper on checks
CREATE INDEX IF NOT EXISTS idx_stream_health_checks_cam_time
  ON public.stream_health_checks(camera_id, created_at DESC);

-- Schedule camera-health-monitor every 3 minutes
SELECT cron.schedule(
  'camera_health_monitor_every_3m',
  '*/3 * * * *',
  $$
  SELECT net.http_post(
    url:='https://fsisdfdwlbfeadwfqpir.supabase.co/functions/v1/camera-health-monitor',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzaXNkZmR3bGJmZWFkd2ZxcGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0ODQzNjQsImV4cCI6MjA5NDA2MDM2NH0.65ZNfgzGMJ6SanvfC9zaQyb_Sd2kO9wYohv52SHRD5s"}'::jsonb,
    body:=jsonb_build_object('ts', now())
  );
  $$
);
