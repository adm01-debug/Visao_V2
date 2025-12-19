-- ============================================
-- VISÃO - Sistema de Vigilância Inteligente
-- Migration: Gravação de Clips de Vídeo (GAP #3)
-- Data: 2025-12-19
-- ============================================

-- ============================================
-- 1. TIPOS ENUM
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.clip_recording_status AS ENUM (
    'idle', 'recording', 'processing', 'ready', 'uploading', 'error'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.clip_trigger_type AS ENUM (
    'manual', 'alert', 'motion', 'schedule', 'rule', 'api'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.clip_format AS ENUM ('mp4', 'webm', 'gif');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.clip_quality AS ENUM ('low', 'medium', 'high', 'original');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. TABELA: Configurações de Gravação
-- ============================================

CREATE TABLE IF NOT EXISTS public.recording_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  
  -- Duração
  max_duration INTEGER NOT NULL DEFAULT 60,
  min_duration INTEGER NOT NULL DEFAULT 5,
  pre_event_seconds INTEGER NOT NULL DEFAULT 5,
  post_event_seconds INTEGER NOT NULL DEFAULT 10,
  
  -- Formato
  format clip_format NOT NULL DEFAULT 'mp4',
  quality clip_quality NOT NULL DEFAULT 'high',
  fps INTEGER NOT NULL DEFAULT 15,
  
  -- Triggers automáticos
  auto_on_alert BOOLEAN DEFAULT true,
  auto_on_motion BOOLEAN DEFAULT false,
  auto_on_rule BOOLEAN DEFAULT true,
  auto_min_severity TEXT DEFAULT 'medium',
  
  -- Storage
  save_local BOOLEAN DEFAULT true,
  upload_to_cloud BOOLEAN DEFAULT true,
  storage_bucket TEXT DEFAULT 'clips',
  retention_days INTEGER DEFAULT 30,
  
  -- Watermark
  watermark_enabled BOOLEAN DEFAULT true,
  watermark_text TEXT,
  watermark_position TEXT DEFAULT 'bottom-right',
  watermark_timestamp BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_config_per_camera UNIQUE (camera_id)
);

CREATE INDEX IF NOT EXISTS idx_recording_configs_camera ON public.recording_configs(camera_id);

ALTER TABLE public.recording_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on recording_configs" ON public.recording_configs FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 3. TABELA: Clips de Vídeo
-- ============================================

CREATE TABLE IF NOT EXISTS public.video_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  camera_name TEXT NOT NULL,
  
  -- Status
  status clip_recording_status NOT NULL DEFAULT 'idle',
  
  -- Trigger
  trigger clip_trigger_type NOT NULL DEFAULT 'manual',
  trigger_id TEXT,
  trigger_details JSONB,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  
  -- Duração e frames
  duration REAL NOT NULL DEFAULT 0,
  frame_count INTEGER NOT NULL DEFAULT 0,
  
  -- Arquivos
  file_url TEXT,
  local_url TEXT,
  file_size BIGINT,
  format clip_format NOT NULL DEFAULT 'mp4',
  thumbnail_url TEXT,
  
  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Organização
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  is_viewed BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_clips_camera ON public.video_clips(camera_id);
CREATE INDEX IF NOT EXISTS idx_clips_status ON public.video_clips(status);
CREATE INDEX IF NOT EXISTS idx_clips_trigger ON public.video_clips(trigger);
CREATE INDEX IF NOT EXISTS idx_clips_started_at ON public.video_clips(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_favorite ON public.video_clips(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_clips_unviewed ON public.video_clips(is_viewed) WHERE is_viewed = false;

ALTER TABLE public.video_clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on video_clips" ON public.video_clips FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 4. TABELA: Sessões de Gravação
-- ============================================

CREATE TABLE IF NOT EXISTS public.recording_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  config_id UUID REFERENCES public.recording_configs(id) ON DELETE SET NULL,
  
  status clip_recording_status NOT NULL DEFAULT 'recording',
  trigger clip_trigger_type NOT NULL DEFAULT 'manual',
  trigger_id TEXT,
  
  frame_count INTEGER DEFAULT 0,
  current_duration REAL DEFAULT 0,
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  error TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_camera ON public.recording_sessions(camera_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.recording_sessions(status) WHERE status = 'recording';

ALTER TABLE public.recording_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on recording_sessions" ON public.recording_sessions FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 5. FUNÇÕES RPC
-- ============================================

-- Iniciar gravação
CREATE OR REPLACE FUNCTION public.start_clip_recording(
  p_camera_id UUID,
  p_trigger clip_trigger_type DEFAULT 'manual',
  p_trigger_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  INSERT INTO public.recording_sessions (camera_id, trigger, trigger_id, status)
  VALUES (p_camera_id, p_trigger, p_trigger_id, 'recording')
  RETURNING id INTO v_session_id;
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Finalizar gravação
CREATE OR REPLACE FUNCTION public.finish_clip_recording(
  p_session_id UUID,
  p_file_url TEXT DEFAULT NULL,
  p_file_size BIGINT DEFAULT NULL,
  p_thumbnail_url TEXT DEFAULT NULL,
  p_duration REAL DEFAULT 0,
  p_frame_count INTEGER DEFAULT 0,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_clip_id UUID;
  v_session RECORD;
  v_camera_name TEXT;
BEGIN
  SELECT * INTO v_session FROM public.recording_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sessão não encontrada'; END IF;
  
  SELECT name INTO v_camera_name FROM public.cameras WHERE id = v_session.camera_id;
  
  INSERT INTO public.video_clips (
    camera_id, camera_name, status, trigger, trigger_id,
    started_at, ended_at, duration, frame_count,
    file_url, file_size, thumbnail_url, metadata
  ) VALUES (
    v_session.camera_id, v_camera_name, 'ready', v_session.trigger, v_session.trigger_id,
    v_session.started_at, now(), p_duration, p_frame_count,
    p_file_url, p_file_size, p_thumbnail_url, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_clip_id;
  
  UPDATE public.recording_sessions
  SET status = 'ready', ended_at = now(), frame_count = p_frame_count, current_duration = p_duration
  WHERE id = p_session_id;
  
  RETURN v_clip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Estatísticas de clips
CREATE OR REPLACE FUNCTION public.get_clip_stats(
  p_camera_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_clips BIGINT,
  total_duration REAL,
  total_size BIGINT,
  favorites_count BIGINT,
  unviewed_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COALESCE(SUM(vc.duration), 0)::REAL,
    COALESCE(SUM(vc.file_size), 0)::BIGINT,
    COUNT(*) FILTER (WHERE vc.is_favorite)::BIGINT,
    COUNT(*) FILTER (WHERE NOT vc.is_viewed)::BIGINT
  FROM public.video_clips vc
  WHERE (p_camera_id IS NULL OR vc.camera_id = p_camera_id)
    AND vc.created_at >= now() - (p_days || ' days')::INTERVAL
    AND vc.status = 'ready';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle favorito
CREATE OR REPLACE FUNCTION public.toggle_clip_favorite(p_clip_id UUID)
RETURNS BOOLEAN AS $$
DECLARE v_new_state BOOLEAN;
BEGIN
  UPDATE public.video_clips SET is_favorite = NOT is_favorite
  WHERE id = p_clip_id RETURNING is_favorite INTO v_new_state;
  RETURN v_new_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Marcar como visto
CREATE OR REPLACE FUNCTION public.mark_clip_viewed(p_clip_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.video_clips SET is_viewed = true WHERE id = p_clip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Limpar clips antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_clips(p_retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE v_deleted INTEGER;
BEGIN
  DELETE FROM public.video_clips
  WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL
    AND is_favorite = false;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. VIEW: Dashboard de Clips
-- ============================================

CREATE OR REPLACE VIEW public.clips_dashboard AS
SELECT 
  c.id as camera_id,
  c.name as camera_name,
  c.location as camera_location,
  COUNT(vc.id) as total_clips,
  COUNT(vc.id) FILTER (WHERE vc.trigger = 'alert') as alert_clips,
  COUNT(vc.id) FILTER (WHERE vc.trigger = 'manual') as manual_clips,
  COALESCE(SUM(vc.duration), 0) as total_duration,
  COALESCE(SUM(vc.file_size), 0) as total_size,
  COUNT(vc.id) FILTER (WHERE NOT vc.is_viewed) as unviewed_count,
  COUNT(vc.id) FILTER (WHERE vc.is_favorite) as favorites_count,
  MAX(vc.started_at) as last_clip_at
FROM public.cameras c
LEFT JOIN public.video_clips vc ON vc.camera_id = c.id AND vc.status = 'ready'
GROUP BY c.id, c.name, c.location;

-- ============================================
-- 7. TRIGGER: Updated_at automático
-- ============================================

CREATE OR REPLACE FUNCTION update_clips_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_video_clips_timestamp
BEFORE UPDATE ON public.video_clips
FOR EACH ROW EXECUTE FUNCTION update_clips_updated_at();

CREATE TRIGGER update_recording_configs_timestamp
BEFORE UPDATE ON public.recording_configs
FOR EACH ROW EXECUTE FUNCTION update_clips_updated_at();

CREATE TRIGGER update_recording_sessions_timestamp
BEFORE UPDATE ON public.recording_sessions
FOR EACH ROW EXECUTE FUNCTION update_clips_updated_at();
