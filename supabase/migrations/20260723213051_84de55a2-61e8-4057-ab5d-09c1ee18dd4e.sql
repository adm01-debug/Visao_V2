ALTER TABLE public.nvr_recording_downloads
  ADD COLUMN IF NOT EXISTS source_format TEXT,
  ADD COLUMN IF NOT EXISTS converted_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS converted_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS conversion_status TEXT
    CHECK (conversion_status IN ('pending','converting','completed','failed','skipped'))
    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS conversion_error TEXT,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_nvr_recording_downloads_conversion_status
  ON public.nvr_recording_downloads (conversion_status)
  WHERE conversion_status IS NOT NULL;