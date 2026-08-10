
CREATE TABLE public.ptz_connection_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  profile_id TEXT,
  backend TEXT NOT NULL,
  ok BOOLEAN NOT NULL DEFAULT false,
  reachable BOOLEAN NOT NULL DEFAULT false,
  http_status INT NOT NULL DEFAULT 0,
  latency_ms INT NOT NULL DEFAULT 0,
  error_detail TEXT,
  used_relay BOOLEAN NOT NULL DEFAULT false,
  relay_agent_id UUID REFERENCES public.local_agents(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'backends_test' CHECK (source IN ('backends_test','runtime','wizard')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ptz_connection_attempts TO authenticated;
GRANT ALL ON public.ptz_connection_attempts TO service_role;

CREATE INDEX idx_ptz_attempts_camera_created ON public.ptz_connection_attempts (camera_id, created_at DESC);
CREATE INDEX idx_ptz_attempts_profile_created ON public.ptz_connection_attempts (profile_id, created_at DESC) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_ptz_attempts_user_created ON public.ptz_connection_attempts (user_id, created_at DESC);
CREATE INDEX idx_ptz_attempts_backend_ok ON public.ptz_connection_attempts (backend, ok, created_at DESC);

ALTER TABLE public.ptz_connection_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ptz attempts"
  ON public.ptz_connection_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own ptz attempts"
  ON public.ptz_connection_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
