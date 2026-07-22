ALTER TABLE public.camera_presets ADD COLUMN IF NOT EXISTS uses INT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_camera_presets_uses ON public.camera_presets (camera_id, uses DESC);