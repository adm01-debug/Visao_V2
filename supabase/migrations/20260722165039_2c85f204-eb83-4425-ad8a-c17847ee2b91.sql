
CREATE TABLE public.stream_alert_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camera_id UUID NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  consecutive_threshold SMALLINT NOT NULL DEFAULT 2 CHECK (consecutive_threshold BETWEEN 1 AND 20),
  cooldown_minutes SMALLINT NOT NULL DEFAULT 30 CHECK (cooldown_minutes BETWEEN 1 AND 1440),
  critical_latency_ms INTEGER NOT NULL DEFAULT 400 CHECK (critical_latency_ms BETWEEN 50 AND 10000),
  critical_jitter_ms INTEGER NOT NULL DEFAULT 120 CHECK (critical_jitter_ms BETWEEN 5 AND 5000),
  critical_loss_pct SMALLINT NOT NULL DEFAULT 5 CHECK (critical_loss_pct BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX stream_alert_thresholds_user_default_uidx
  ON public.stream_alert_thresholds(user_id) WHERE camera_id IS NULL;
CREATE UNIQUE INDEX stream_alert_thresholds_user_camera_uidx
  ON public.stream_alert_thresholds(user_id, camera_id) WHERE camera_id IS NOT NULL;
CREATE INDEX stream_alert_thresholds_camera_idx ON public.stream_alert_thresholds(camera_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stream_alert_thresholds TO authenticated;
GRANT ALL ON public.stream_alert_thresholds TO service_role;

ALTER TABLE public.stream_alert_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own thresholds"
  ON public.stream_alert_thresholds FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER stream_alert_thresholds_updated_at
  BEFORE UPDATE ON public.stream_alert_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
