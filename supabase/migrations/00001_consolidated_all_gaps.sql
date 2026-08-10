-- ============================================
-- VISÃO - Sistema de Vigilância Inteligente
-- MIGRATION CONSOLIDADA - TODOS OS GAPS
-- Data: 2025-12-19
-- 
-- Aplicar em ordem:
-- 1. Streaming de Vídeo
-- 2. Análise Contínua
-- 3. Gravação de Clips
-- 4. Reconhecimento Facial
-- 5. Zonas de Interesse
-- ============================================

-- ============================================
-- GAP #1: STREAMING DE VÍDEO
-- ============================================

-- Tipos para streaming
DO $$ BEGIN
  CREATE TYPE public.stream_protocol AS ENUM ('hls', 'rtsp', 'webrtc', 'mjpeg');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stream_status AS ENUM ('active', 'inactive', 'error', 'connecting');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Adicionar colunas de streaming à tabela cameras (se existir)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cameras') THEN
    ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS stream_url TEXT;
    ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS stream_protocol stream_protocol DEFAULT 'hls';
    ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS stream_status stream_status DEFAULT 'inactive';
    ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS stream_config JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS last_frame_at TIMESTAMPTZ;
    ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS fps REAL;
    ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS resolution TEXT;
  END IF;
END $$;

-- ============================================
-- GAP #2: ANÁLISE CONTÍNUA
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.analysis_session_status AS ENUM ('idle', 'running', 'paused', 'error', 'stopped', 'scheduled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Configurações de análise contínua
CREATE TABLE IF NOT EXISTS public.continuous_analysis_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  analysis_types TEXT[] DEFAULT '{"security"}',
  interval_ms INTEGER DEFAULT 5000 CHECK (interval_ms >= 3000),
  schedule_enabled BOOLEAN DEFAULT false,
  schedule_start_time TIME,
  schedule_end_time TIME,
  schedule_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  alert_thresholds JSONB DEFAULT '{}'::jsonb,
  save_history BOOLEAN DEFAULT true,
  max_history_size INTEGER DEFAULT 100,
  create_alerts BOOLEAN DEFAULT true,
  rule_ids UUID[] DEFAULT '{}',
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (camera_id)
);

-- Sessões de análise
CREATE TABLE IF NOT EXISTS public.analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  config_id UUID REFERENCES public.continuous_analysis_configs(id) ON DELETE SET NULL,
  status analysis_session_status NOT NULL DEFAULT 'idle',
  total_analyses INTEGER DEFAULT 0,
  successful_analyses INTEGER DEFAULT 0,
  failed_analyses INTEGER DEFAULT 0,
  alerts_generated INTEGER DEFAULT 0,
  total_people_detected INTEGER DEFAULT 0,
  avg_people_per_analysis REAL DEFAULT 0,
  avg_analysis_time_ms REAL DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  last_analysis_at TIMESTAMPTZ,
  next_analysis_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Histórico de análises
CREATE TABLE IF NOT EXISTS public.analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  result JSONB NOT NULL,
  people_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  alerts_generated INTEGER DEFAULT 0,
  violated_rules UUID[] DEFAULT '{}',
  snapshot_url TEXT,
  success BOOLEAN DEFAULT true,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analysis_history_session ON public.analysis_history(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_camera ON public.analysis_history(camera_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_created ON public.analysis_history(created_at DESC);

ALTER TABLE public.continuous_analysis_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on continuous_analysis_configs" ON public.continuous_analysis_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on analysis_sessions" ON public.analysis_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on analysis_history" ON public.analysis_history FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- GAP #3: GRAVAÇÃO DE CLIPS
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.clip_recording_status AS ENUM ('idle', 'recording', 'processing', 'ready', 'uploading', 'error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.clip_trigger_type AS ENUM ('manual', 'alert', 'motion', 'schedule', 'rule', 'api');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.clip_format AS ENUM ('mp4', 'webm', 'gif');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.clip_quality AS ENUM ('low', 'medium', 'high', 'original');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Configurações de gravação
CREATE TABLE IF NOT EXISTS public.recording_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  max_duration INTEGER NOT NULL DEFAULT 60,
  min_duration INTEGER NOT NULL DEFAULT 5,
  pre_event_seconds INTEGER NOT NULL DEFAULT 5,
  post_event_seconds INTEGER NOT NULL DEFAULT 10,
  format clip_format NOT NULL DEFAULT 'mp4',
  quality clip_quality NOT NULL DEFAULT 'high',
  fps INTEGER NOT NULL DEFAULT 15,
  auto_on_alert BOOLEAN DEFAULT true,
  auto_on_motion BOOLEAN DEFAULT false,
  auto_on_rule BOOLEAN DEFAULT true,
  auto_min_severity TEXT DEFAULT 'medium',
  save_local BOOLEAN DEFAULT true,
  upload_to_cloud BOOLEAN DEFAULT true,
  storage_bucket TEXT DEFAULT 'clips',
  retention_days INTEGER DEFAULT 30,
  watermark_enabled BOOLEAN DEFAULT true,
  watermark_text TEXT,
  watermark_position TEXT DEFAULT 'bottom-right',
  watermark_timestamp BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_recording_config_per_camera UNIQUE (camera_id)
);

-- Clips de vídeo
CREATE TABLE IF NOT EXISTS public.video_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  camera_name TEXT NOT NULL,
  status clip_recording_status NOT NULL DEFAULT 'idle',
  trigger clip_trigger_type NOT NULL DEFAULT 'manual',
  trigger_id TEXT,
  trigger_details JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration REAL NOT NULL DEFAULT 0,
  frame_count INTEGER NOT NULL DEFAULT 0,
  file_url TEXT,
  local_url TEXT,
  file_size BIGINT,
  format clip_format NOT NULL DEFAULT 'mp4',
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  is_viewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_clips_camera ON public.video_clips(camera_id);
CREATE INDEX IF NOT EXISTS idx_clips_status ON public.video_clips(status);
CREATE INDEX IF NOT EXISTS idx_clips_trigger ON public.video_clips(trigger);
CREATE INDEX IF NOT EXISTS idx_clips_started_at ON public.video_clips(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_favorite ON public.video_clips(is_favorite) WHERE is_favorite = true;

ALTER TABLE public.recording_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on recording_configs" ON public.recording_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on video_clips" ON public.video_clips FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- GAP #4: RECONHECIMENTO FACIAL
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.person_list_type AS ENUM ('whitelist', 'blacklist', 'vip', 'employee', 'visitor', 'contractor', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.person_status AS ENUM ('active', 'inactive', 'blocked', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Pessoas cadastradas
CREATE TABLE IF NOT EXISTS public.registered_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document TEXT,
  document_type TEXT DEFAULT 'cpf',
  email TEXT,
  phone TEXT,
  company TEXT,
  department TEXT,
  role TEXT,
  list_type person_list_type NOT NULL DEFAULT 'visitor',
  status person_status NOT NULL DEFAULT 'active',
  photo_url TEXT,
  training_photos TEXT[] DEFAULT '{}',
  face_encoding REAL[],
  encoding_quality REAL,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  access_schedule JSONB,
  allowed_cameras TEXT[] DEFAULT '{}',
  last_seen_at TIMESTAMPTZ,
  last_seen_camera_id TEXT,
  last_seen_camera_name TEXT,
  recognition_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_persons_name ON public.registered_persons(name);
CREATE INDEX IF NOT EXISTS idx_persons_list_type ON public.registered_persons(list_type);
CREATE INDEX IF NOT EXISTS idx_persons_status ON public.registered_persons(status);
CREATE INDEX IF NOT EXISTS idx_persons_company ON public.registered_persons(company);

-- Logs de reconhecimento
CREATE TABLE IF NOT EXISTS public.recognition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id TEXT NOT NULL,
  camera_name TEXT NOT NULL,
  person_id UUID REFERENCES public.registered_persons(id) ON DELETE SET NULL,
  person_name TEXT,
  list_type person_list_type,
  similarity REAL,
  is_known BOOLEAN NOT NULL DEFAULT false,
  action TEXT,
  face_snapshot TEXT,
  frame_snapshot TEXT,
  bounding_box JSONB,
  attributes JSONB,
  alert_generated BOOLEAN DEFAULT false,
  alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recognition_logs_camera ON public.recognition_logs(camera_id);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_person ON public.recognition_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_created ON public.recognition_logs(created_at DESC);

-- Configuração de reconhecimento facial
CREATE TABLE IF NOT EXISTS public.face_recognition_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id TEXT,
  enabled BOOLEAN DEFAULT true,
  match_threshold REAL DEFAULT 0.6,
  min_face_quality REAL DEFAULT 0.5,
  min_face_size INTEGER DEFAULT 80,
  detect_multiple_faces BOOLEAN DEFAULT true,
  max_faces_per_frame INTEGER DEFAULT 10,
  actions JSONB DEFAULT '{"whitelist":"allow","blacklist":"alert","vip":"notify","employee":"log","visitor":"log","unknown":"log"}'::jsonb,
  alert_on_unknown BOOLEAN DEFAULT false,
  alert_cooldown INTEGER DEFAULT 60,
  save_unknown_faces BOOLEAN DEFAULT true,
  check_access_schedule BOOLEAN DEFAULT false,
  check_allowed_cameras BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.registered_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_recognition_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on registered_persons" ON public.registered_persons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on recognition_logs" ON public.recognition_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on face_recognition_configs" ON public.face_recognition_configs FOR ALL USING (true) WITH CHECK (true);

-- Configuração global padrão
INSERT INTO public.face_recognition_configs (camera_id, enabled)
VALUES (NULL, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- GAP #5: ZONAS DE INTERESSE
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.zone_shape AS ENUM ('polygon', 'rectangle', 'circle', 'line');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.zone_type AS ENUM ('restricted', 'counting', 'tripwire', 'dwell', 'occupancy', 'parking', 'queue', 'safety', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.zone_event_type AS ENUM ('enter', 'exit', 'cross_line', 'dwell_time', 'occupancy', 'count_in', 'count_out', 'crowd_density', 'loitering', 'wrong_direction', 'ppe_violation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Zonas de interesse
CREATE TABLE IF NOT EXISTS public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type zone_type NOT NULL DEFAULT 'custom',
  geometry JSONB NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  opacity REAL DEFAULT 0.3,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  rules JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_zones_camera ON public.zones(camera_id);
CREATE INDEX IF NOT EXISTS idx_zones_type ON public.zones(type);
CREATE INDEX IF NOT EXISTS idx_zones_enabled ON public.zones(enabled) WHERE enabled = true;

-- Eventos de zona
CREATE TABLE IF NOT EXISTS public.zone_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  camera_id TEXT NOT NULL,
  event_type zone_event_type NOT NULL,
  object_id TEXT,
  object_type TEXT,
  value REAL,
  alert_generated BOOLEAN DEFAULT false,
  alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
  snapshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zone_events_zone ON public.zone_events(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_events_camera ON public.zone_events(camera_id);
CREATE INDEX IF NOT EXISTS idx_zone_events_type ON public.zone_events(event_type);
CREATE INDEX IF NOT EXISTS idx_zone_events_created ON public.zone_events(created_at DESC);

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on zones" ON public.zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on zone_events" ON public.zone_events FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- FUNÇÕES UTILITÁRIAS
-- ============================================

-- Trigger genérico para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
    AND table_name IN ('continuous_analysis_configs', 'analysis_sessions', 'recording_configs', 
                       'video_clips', 'registered_persons', 'face_recognition_configs', 'zones')
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I;
      CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ============================================
-- FUNÇÕES RPC PRINCIPAIS
-- ============================================

-- Estatísticas de clips
CREATE OR REPLACE FUNCTION public.get_clip_stats(p_camera_id UUID DEFAULT NULL, p_days INTEGER DEFAULT 30)
RETURNS TABLE (total_clips BIGINT, total_duration REAL, total_size BIGINT, favorites_count BIGINT, unviewed_count BIGINT) AS $$
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

-- Toggle favorito de clip
CREATE OR REPLACE FUNCTION public.toggle_clip_favorite(p_clip_id UUID)
RETURNS BOOLEAN AS $$
DECLARE v_new_state BOOLEAN;
BEGIN
  UPDATE public.video_clips SET is_favorite = NOT is_favorite
  WHERE id = p_clip_id RETURNING is_favorite INTO v_new_state;
  RETURN v_new_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Estatísticas de reconhecimento facial
CREATE OR REPLACE FUNCTION public.get_recognition_stats(p_camera_id TEXT DEFAULT NULL, p_hours INTEGER DEFAULT 24)
RETURNS TABLE (total_detections BIGINT, known_count BIGINT, unknown_count BIGINT, alerts_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE is_known)::BIGINT,
    COUNT(*) FILTER (WHERE NOT is_known)::BIGINT,
    COUNT(*) FILTER (WHERE alert_generated)::BIGINT
  FROM public.recognition_logs
  WHERE (p_camera_id IS NULL OR camera_id = p_camera_id)
    AND created_at >= now() - (p_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Estatísticas de zona
CREATE OR REPLACE FUNCTION public.get_zone_stats(p_zone_id UUID, p_hours INTEGER DEFAULT 24)
RETURNS TABLE (count_in BIGINT, count_out BIGINT, alerts_count BIGINT, last_event_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE event_type IN ('enter', 'count_in'))::BIGINT,
    COUNT(*) FILTER (WHERE event_type IN ('exit', 'count_out'))::BIGINT,
    COUNT(*) FILTER (WHERE alert_generated)::BIGINT,
    MAX(created_at)
  FROM public.zone_events
  WHERE zone_id = p_zone_id AND created_at >= now() - (p_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar último acesso de pessoa
CREATE OR REPLACE FUNCTION public.update_person_last_seen(p_person_id UUID, p_camera_id TEXT, p_camera_name TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.registered_persons
  SET last_seen_at = now(), last_seen_camera_id = p_camera_id, last_seen_camera_name = p_camera_name, recognition_count = recognition_count + 1
  WHERE id = p_person_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEWS PARA DASHBOARDS
-- ============================================

-- Dashboard de câmeras com streaming
CREATE OR REPLACE VIEW public.cameras_streaming_status AS
SELECT 
  c.id, c.name, c.location, c.status,
  c.stream_url, c.stream_protocol, c.stream_status,
  c.fps, c.resolution, c.last_frame_at,
  (SELECT COUNT(*) FROM public.analysis_sessions WHERE camera_id = c.id AND status = 'running') as active_analyses,
  (SELECT COUNT(*) FROM public.zones WHERE camera_id = c.id AND enabled = true) as active_zones
FROM public.cameras c;

-- Dashboard de reconhecimento facial
CREATE OR REPLACE VIEW public.face_recognition_dashboard AS
SELECT 
  c.id as camera_id, c.name as camera_name,
  COUNT(rl.id) FILTER (WHERE rl.created_at >= now() - INTERVAL '24 hours') as recognitions_24h,
  COUNT(rl.id) FILTER (WHERE rl.is_known AND rl.created_at >= now() - INTERVAL '24 hours') as known_24h,
  COUNT(rl.id) FILTER (WHERE rl.alert_generated AND rl.created_at >= now() - INTERVAL '24 hours') as alerts_24h
FROM public.cameras c
LEFT JOIN public.recognition_logs rl ON rl.camera_id = c.id::TEXT
GROUP BY c.id, c.name;

-- Dashboard de zonas
CREATE OR REPLACE VIEW public.zones_dashboard AS
SELECT 
  z.id, z.name, z.type, z.color, z.enabled, c.name as camera_name,
  COUNT(ze.id) FILTER (WHERE ze.created_at >= now() - INTERVAL '24 hours') as events_24h,
  COUNT(ze.id) FILTER (WHERE ze.alert_generated AND ze.created_at >= now() - INTERVAL '24 hours') as alerts_24h,
  MAX(ze.created_at) as last_event
FROM public.zones z
JOIN public.cameras c ON c.id = z.camera_id
LEFT JOIN public.zone_events ze ON ze.zone_id = z.id
GROUP BY z.id, z.name, z.type, z.color, z.enabled, c.name;

-- ============================================
-- LIMPEZA AUTOMÁTICA (FUNÇÕES PARA CRON)
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_data(p_days INTEGER DEFAULT 30)
RETURNS TABLE (table_name TEXT, deleted_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Limpar histórico de análises
  DELETE FROM public.analysis_history WHERE created_at < now() - (p_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'analysis_history'; deleted_count := v_count; RETURN NEXT;
  
  -- Limpar logs de reconhecimento
  DELETE FROM public.recognition_logs WHERE created_at < now() - (p_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'recognition_logs'; deleted_count := v_count; RETURN NEXT;
  
  -- Limpar eventos de zona
  DELETE FROM public.zone_events WHERE created_at < now() - (p_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'zone_events'; deleted_count := v_count; RETURN NEXT;
  
  -- Limpar clips não favoritos
  DELETE FROM public.video_clips WHERE created_at < now() - (p_days || ' days')::INTERVAL AND is_favorite = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'video_clips'; deleted_count := v_count; RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIM DA MIGRATION CONSOLIDADA
-- ============================================

SELECT 'Migration VISÃO aplicada com sucesso!' as status, now() as applied_at;
