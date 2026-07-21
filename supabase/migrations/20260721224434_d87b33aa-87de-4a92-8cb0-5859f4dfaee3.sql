
-- ============ timelapse_configs ============
CREATE TABLE public.timelapse_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  capture_interval_minutes INT NOT NULL DEFAULT 5 CHECK (capture_interval_minutes BETWEEN 1 AND 120),
  start_hour INT NOT NULL DEFAULT 6 CHECK (start_hour BETWEEN 0 AND 23),
  end_hour INT NOT NULL DEFAULT 20 CHECK (end_hour BETWEEN 1 AND 24),
  fps INT NOT NULL DEFAULT 30 CHECK (fps BETWEEN 5 AND 60),
  retention_days INT NOT NULL DEFAULT 7 CHECK (retention_days BETWEEN 1 AND 365),
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  last_capture_at TIMESTAMPTZ,
  last_render_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_hour < end_hour),
  UNIQUE (user_id, camera_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timelapse_configs TO authenticated;
GRANT ALL ON public.timelapse_configs TO service_role;
ALTER TABLE public.timelapse_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own configs select" ON public.timelapse_configs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own configs insert" ON public.timelapse_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own configs update" ON public.timelapse_configs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own configs delete" ON public.timelapse_configs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_timelapse_configs_updated
BEFORE UPDATE ON public.timelapse_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ timelapse_snapshots ============
CREATE TABLE public.timelapse_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES public.timelapse_configs(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tl_snap_config_captured ON public.timelapse_snapshots (config_id, captured_at DESC);
CREATE INDEX idx_tl_snap_user ON public.timelapse_snapshots (user_id);

GRANT SELECT, INSERT, DELETE ON public.timelapse_snapshots TO authenticated;
GRANT ALL ON public.timelapse_snapshots TO service_role;
ALTER TABLE public.timelapse_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own snaps select" ON public.timelapse_snapshots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own snaps insert" ON public.timelapse_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own snaps delete" ON public.timelapse_snapshots FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ timelapse_videos ============
CREATE TABLE public.timelapse_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES public.timelapse_configs(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  video_date DATE NOT NULL,
  storage_path TEXT,
  frame_count INT NOT NULL DEFAULT 0,
  duration_seconds NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','rendering','ready','failed','skipped')),
  error TEXT,
  rendered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (config_id, video_date)
);
CREATE INDEX idx_tl_video_user_date ON public.timelapse_videos (user_id, video_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.timelapse_videos TO authenticated;
GRANT ALL ON public.timelapse_videos TO service_role;
ALTER TABLE public.timelapse_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own videos select" ON public.timelapse_videos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own videos insert" ON public.timelapse_videos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own videos update" ON public.timelapse_videos FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own videos delete" ON public.timelapse_videos FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_timelapse_videos_updated
BEFORE UPDATE ON public.timelapse_videos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Runner de captura (marca a intenção; captura real é feita por edge function/worker) ============
CREATE OR REPLACE FUNCTION public.tick_timelapse_capture()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  affected INT := 0;
  local_hour INT;
  local_minute INT;
BEGIN
  FOR rec IN
    SELECT * FROM public.timelapse_configs WHERE enabled = true
  LOOP
    local_hour := EXTRACT(HOUR FROM (now() AT TIME ZONE rec.timezone))::INT;
    local_minute := EXTRACT(MINUTE FROM (now() AT TIME ZONE rec.timezone))::INT;
    -- Dentro da janela?
    IF local_hour < rec.start_hour OR local_hour >= rec.end_hour THEN
      CONTINUE;
    END IF;
    -- Alinha ao intervalo (minuto múltiplo do intervalo)
    IF (local_minute % rec.capture_interval_minutes) <> 0 THEN
      CONTINUE;
    END IF;
    -- Deduplica: já capturamos nos últimos (interval - 1) minutos?
    IF rec.last_capture_at IS NOT NULL
       AND rec.last_capture_at > (now() - make_interval(mins => rec.capture_interval_minutes - 1)) THEN
      CONTINUE;
    END IF;
    UPDATE public.timelapse_configs SET last_capture_at = now() WHERE id = rec.id;
    affected := affected + 1;
    -- Nota: a captura de imagem em si é feita por edge function que lê essas marcações.
  END LOOP;
  RETURN affected;
END;
$$;
REVOKE ALL ON FUNCTION public.tick_timelapse_capture() FROM PUBLIC, anon, authenticated;

-- ============ Purga de snapshots por retenção ============
CREATE OR REPLACE FUNCTION public.purge_timelapse_snapshots()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed INT := 0;
BEGIN
  WITH del AS (
    DELETE FROM public.timelapse_snapshots s
    USING public.timelapse_configs c
    WHERE s.config_id = c.id
      AND s.captured_at < (now() - make_interval(days => c.retention_days))
    RETURNING s.id
  )
  SELECT count(*) INTO removed FROM del;
  RETURN removed;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_timelapse_snapshots() FROM PUBLIC, anon, authenticated;

-- ============ Agendamentos pg_cron ============
DO $$ BEGIN
  PERFORM cron.unschedule('timelapse-capture-tick');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('timelapse-capture-tick', '* * * * *', $$SELECT public.tick_timelapse_capture();$$);

DO $$ BEGIN
  PERFORM cron.unschedule('timelapse-purge-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('timelapse-purge-daily', '15 3 * * *', $$SELECT public.purge_timelapse_snapshots();$$);
