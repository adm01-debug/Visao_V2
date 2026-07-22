
CREATE TABLE public.test_mode_suppressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_function TEXT NOT NULL,
  alert_id TEXT,
  rule_id UUID,
  camera_id UUID,
  channels TEXT[],
  reason TEXT NOT NULL DEFAULT 'test_mode_active',
  payload_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  trace_id TEXT,
  suppressed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_mode_suppressions_user_time
  ON public.test_mode_suppressions (user_id, suppressed_at DESC);
CREATE INDEX idx_test_mode_suppressions_rule
  ON public.test_mode_suppressions (rule_id) WHERE rule_id IS NOT NULL;
CREATE INDEX idx_test_mode_suppressions_camera
  ON public.test_mode_suppressions (camera_id) WHERE camera_id IS NOT NULL;

GRANT SELECT ON public.test_mode_suppressions TO authenticated;
GRANT ALL ON public.test_mode_suppressions TO service_role;

ALTER TABLE public.test_mode_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own test-mode suppressions"
  ON public.test_mode_suppressions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages suppressions"
  ON public.test_mode_suppressions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
