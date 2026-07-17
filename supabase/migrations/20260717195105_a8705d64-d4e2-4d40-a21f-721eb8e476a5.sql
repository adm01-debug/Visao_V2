
DO $$ BEGIN
  CREATE TYPE public.restore_status AS ENUM ('none','in_progress','available','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS restore_status public.restore_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS restore_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_media_assets_restore_status
  ON public.media_assets (restore_status)
  WHERE storage_tier = 'cold';
