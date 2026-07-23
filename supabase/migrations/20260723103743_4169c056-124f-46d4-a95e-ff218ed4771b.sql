
CREATE TABLE public.rtsp_preview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_name TEXT NOT NULL UNIQUE,
  rtsp_url_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rtsp_preview_sessions_user ON public.rtsp_preview_sessions(user_id);
CREATE INDEX idx_rtsp_preview_sessions_expires ON public.rtsp_preview_sessions(expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rtsp_preview_sessions TO authenticated;
GRANT ALL ON public.rtsp_preview_sessions TO service_role;

ALTER TABLE public.rtsp_preview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own preview sessions select" ON public.rtsp_preview_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own preview sessions insert" ON public.rtsp_preview_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own preview sessions update" ON public.rtsp_preview_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own preview sessions delete" ON public.rtsp_preview_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
