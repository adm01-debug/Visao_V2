
CREATE TABLE public.test_mode_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('all', 'camera', 'rule')),
  scope_ids UUID[] NOT NULL DEFAULT '{}',
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (5, 15, 30, 60)),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  ended_reason TEXT CHECK (ended_reason IN ('manual', 'expired', 'superseded')),
  detections_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_mode_sessions TO authenticated;
GRANT ALL ON public.test_mode_sessions TO service_role;

ALTER TABLE public.test_mode_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own test sessions"
  ON public.test_mode_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_test_sessions_active
  ON public.test_mode_sessions(user_id, expires_at)
  WHERE ended_at IS NULL;

CREATE INDEX idx_test_sessions_scope_ids
  ON public.test_mode_sessions USING GIN(scope_ids)
  WHERE ended_at IS NULL;

CREATE OR REPLACE FUNCTION public.tm_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_test_sessions_updated_at
  BEFORE UPDATE ON public.test_mode_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tm_touch_updated_at();

ALTER TABLE public.alerts          ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.event_alerts    ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.rule_executions ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_alerts_is_test          ON public.alerts(user_id, created_at DESC)          WHERE is_test = true;
CREATE INDEX IF NOT EXISTS idx_event_alerts_is_test    ON public.event_alerts(created_at DESC)             WHERE is_test = true;
CREATE INDEX IF NOT EXISTS idx_rule_executions_is_test ON public.rule_executions(user_id, triggered_at DESC) WHERE is_test = true;

ALTER PUBLICATION supabase_realtime ADD TABLE public.test_mode_sessions;

CREATE OR REPLACE FUNCTION public.is_test_mode_active(
  _user_id UUID,
  _camera_id UUID DEFAULT NULL,
  _rule_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.test_mode_sessions
    WHERE user_id = _user_id
      AND ended_at IS NULL
      AND expires_at > now()
      AND (
        scope = 'all'
        OR (scope = 'camera' AND _camera_id IS NOT NULL AND _camera_id = ANY(scope_ids))
        OR (scope = 'rule'   AND _rule_id   IS NOT NULL AND _rule_id   = ANY(scope_ids))
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_test_mode_active(UUID, UUID, UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.close_expired_test_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE affected INTEGER;
BEGIN
  UPDATE public.test_mode_sessions
     SET ended_at = now(), ended_reason = 'expired'
   WHERE ended_at IS NULL AND expires_at <= now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END; $$;

GRANT EXECUTE ON FUNCTION public.close_expired_test_sessions() TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_old_test_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE total INTEGER := 0; n INTEGER;
BEGIN
  DELETE FROM public.alerts          WHERE is_test = true AND created_at   < now() - INTERVAL '7 days';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  DELETE FROM public.event_alerts    WHERE is_test = true AND created_at   < now() - INTERVAL '7 days';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  DELETE FROM public.rule_executions WHERE is_test = true AND triggered_at < now() - INTERVAL '7 days';
  GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
  RETURN total;
END; $$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_test_events() TO service_role;

SELECT cron.schedule(
  'close-expired-test-sessions',
  '* * * * *',
  $$SELECT public.close_expired_test_sessions();$$
);

SELECT cron.schedule(
  'cleanup-old-test-events',
  '17 3 * * *',
  $$SELECT public.cleanup_old_test_events();$$
);
