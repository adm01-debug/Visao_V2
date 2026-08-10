
CREATE TABLE public.nvr_recording_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nvr_id UUID NOT NULL REFERENCES public.nvrs(id) ON DELETE CASCADE,
  channel INTEGER NOT NULL CHECK (channel >= 0 AND channel <= 256),
  stream_type TEXT NOT NULL DEFAULT 'main' CHECK (stream_type IN ('main','sub')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  remote_file_path TEXT,
  storage_bucket TEXT NOT NULL DEFAULT 'nvr-recordings',
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','listing','downloading','completed','failed','canceled')),
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  bytes_downloaded BIGINT NOT NULL DEFAULT 0,
  total_bytes BIGINT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nvr_recording_downloads TO authenticated;
GRANT ALL ON public.nvr_recording_downloads TO service_role;

ALTER TABLE public.nvr_recording_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own nvr downloads"
  ON public.nvr_recording_downloads FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_nvr_downloads_user_status ON public.nvr_recording_downloads (user_id, status, created_at DESC);
CREATE INDEX idx_nvr_downloads_nvr ON public.nvr_recording_downloads (nvr_id, created_at DESC);

CREATE TRIGGER update_nvr_recording_downloads_updated_at
  BEFORE UPDATE ON public.nvr_recording_downloads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for private bucket 'nvr-recordings'
-- Files are stored under <user_id>/<download_id>.dav
CREATE POLICY "Users read their own nvr recordings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'nvr-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users upload their own nvr recordings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'nvr-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update their own nvr recordings"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'nvr-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete their own nvr recordings"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'nvr-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);
