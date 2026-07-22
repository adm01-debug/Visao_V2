ALTER TABLE public.rules
  ADD COLUMN IF NOT EXISTS schedule_cron text,
  ADD COLUMN IF NOT EXISTS schedule_tz text NOT NULL DEFAULT 'America/Sao_Paulo';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='rules_schedule_cron_shape') THEN
    ALTER TABLE public.rules
      ADD CONSTRAINT rules_schedule_cron_shape
      CHECK (schedule_cron IS NULL OR schedule_cron ~ '^\S+\s+\S+\s+\S+\s+\S+\s+\S+$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rules_camera_zone
  ON public.rules USING gin (cameras)
  WHERE zone_id IS NOT NULL;
