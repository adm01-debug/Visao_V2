-- ============================================
-- VISÃO - Sistema de Vigilância Inteligente
-- Migration: Adicionar suporte a streaming de vídeo
-- Data: 2025-12-19
-- ============================================

-- ============================================
-- 1. TIPOS ENUM PARA STREAMING
-- ============================================

-- Protocolo de streaming
CREATE TYPE public.stream_protocol AS ENUM (
  'hls',      -- HTTP Live Streaming (mais compatível)
  'webrtc',   -- WebRTC (menor latência)
  'rtsp',     -- RTSP via proxy
  'mjpeg'     -- Motion JPEG (legado)
);

-- Status da conexão do stream
CREATE TYPE public.stream_status AS ENUM (
  'disconnected',
  'connecting',
  'connected',
  'playing',
  'buffering',
  'paused',
  'error',
  'reconnecting'
);

-- ============================================
-- 2. ADICIONAR COLUNAS DE STREAMING À TABELA CAMERAS
-- ============================================

ALTER TABLE public.cameras 
ADD COLUMN IF NOT EXISTS stream_url TEXT,
ADD COLUMN IF NOT EXISTS stream_protocol stream_protocol DEFAULT 'hls',
ADD COLUMN IF NOT EXISTS stream_status stream_status DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS stream_credentials JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stream_config JSONB DEFAULT '{
  "preferredQuality": "auto",
  "enableAudio": false,
  "bufferLength": 3,
  "reconnection": {
    "enabled": true,
    "maxAttempts": 5,
    "delayMs": 2000
  }
}'::jsonb,
ADD COLUMN IF NOT EXISTS has_ptz BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ptz_capabilities JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_snapshot TEXT,
ADD COLUMN IF NOT EXISTS last_snapshot_at TIMESTAMPTZ;

-- Comentários para documentação
COMMENT ON COLUMN public.cameras.stream_url IS 'URL do stream de vídeo (HLS m3u8, WebRTC signaling, RTSP)';
COMMENT ON COLUMN public.cameras.stream_protocol IS 'Protocolo de streaming utilizado';
COMMENT ON COLUMN public.cameras.stream_status IS 'Status atual da conexão do stream';
COMMENT ON COLUMN public.cameras.stream_credentials IS 'Credenciais de autenticação do stream (username, password)';
COMMENT ON COLUMN public.cameras.stream_config IS 'Configurações do stream (qualidade, buffer, reconexão)';
COMMENT ON COLUMN public.cameras.has_ptz IS 'Indica se a câmera suporta PTZ (Pan-Tilt-Zoom)';
COMMENT ON COLUMN public.cameras.ptz_capabilities IS 'Capacidades e limites do PTZ';
COMMENT ON COLUMN public.cameras.last_snapshot IS 'URL ou base64 do último snapshot';
COMMENT ON COLUMN public.cameras.last_snapshot_at IS 'Timestamp do último snapshot';

-- ============================================
-- 3. TABELA DE GRAVAÇÕES DE STREAM
-- ============================================

CREATE TABLE IF NOT EXISTS public.stream_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  
  -- Informações temporais
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  duration INTEGER, -- em segundos
  
  -- Arquivo
  file_url TEXT,
  file_size BIGINT, -- em bytes
  file_format TEXT DEFAULT 'mp4',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'ready', 'error', 'deleted')),
  error_message TEXT,
  
  -- Trigger (o que iniciou a gravação)
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'alert', 'schedule', 'motion', 'api')),
  trigger_id UUID, -- ID do alerta/regra que disparou
  trigger_details JSONB,
  
  -- Metadados
  thumbnail TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_recordings_camera_id ON public.stream_recordings(camera_id);
CREATE INDEX IF NOT EXISTS idx_recordings_start_time ON public.stream_recordings(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON public.stream_recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_trigger ON public.stream_recordings(trigger_type, trigger_id);

-- RLS
ALTER TABLE public.stream_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on stream_recordings"
ON public.stream_recordings
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_stream_recordings_updated_at
BEFORE UPDATE ON public.stream_recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_rules_updated_at();

-- ============================================
-- 4. TABELA DE ESTATÍSTICAS DE STREAM
-- ============================================

CREATE TABLE IF NOT EXISTS public.stream_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  
  -- Timestamp
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Métricas
  bitrate INTEGER, -- kbps
  fps REAL,
  resolution_width INTEGER,
  resolution_height INTEGER,
  latency INTEGER, -- ms
  dropped_frames INTEGER,
  buffer_length REAL, -- segundos
  
  -- Conexão
  connection_status stream_status,
  reconnect_attempts INTEGER DEFAULT 0,
  
  -- Período
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL
);

-- Índice para consultas por câmera e tempo
CREATE INDEX IF NOT EXISTS idx_stream_stats_camera_time 
ON public.stream_stats(camera_id, recorded_at DESC);

-- Particionamento por tempo (para alta volumetria)
-- Opcional: implementar se necessário

-- RLS
ALTER TABLE public.stream_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on stream_stats"
ON public.stream_stats
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- 5. TABELA DE SNAPSHOTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.camera_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  
  -- Imagem
  image_url TEXT, -- URL do storage
  image_base64 TEXT, -- Ou base64 direto (para pequenas imagens)
  
  -- Trigger
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled', 'alert', 'motion', 'analysis')),
  trigger_id UUID,
  
  -- Análise (se houver)
  analysis_result JSONB,
  
  -- Metadados
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_snapshots_camera_time 
ON public.camera_snapshots(camera_id, created_at DESC);

-- RLS
ALTER TABLE public.camera_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on camera_snapshots"
ON public.camera_snapshots
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- 6. FUNÇÃO: Atualizar status do stream
-- ============================================

CREATE OR REPLACE FUNCTION public.update_camera_stream_status(
  p_camera_id UUID,
  p_status stream_status,
  p_snapshot TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE public.cameras
  SET 
    stream_status = p_status,
    last_activity = now(),
    last_snapshot = COALESCE(p_snapshot, last_snapshot),
    last_snapshot_at = CASE WHEN p_snapshot IS NOT NULL THEN now() ELSE last_snapshot_at END,
    updated_at = now()
  WHERE id = p_camera_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. FUNÇÃO: Iniciar gravação
-- ============================================

CREATE OR REPLACE FUNCTION public.start_stream_recording(
  p_camera_id UUID,
  p_trigger_type TEXT DEFAULT 'manual',
  p_trigger_id UUID DEFAULT NULL,
  p_trigger_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_recording_id UUID;
BEGIN
  INSERT INTO public.stream_recordings (
    camera_id,
    trigger_type,
    trigger_id,
    trigger_details,
    status
  ) VALUES (
    p_camera_id,
    p_trigger_type,
    p_trigger_id,
    p_trigger_details,
    'recording'
  )
  RETURNING id INTO v_recording_id;
  
  RETURN v_recording_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. FUNÇÃO: Finalizar gravação
-- ============================================

CREATE OR REPLACE FUNCTION public.stop_stream_recording(
  p_recording_id UUID,
  p_file_url TEXT DEFAULT NULL,
  p_file_size BIGINT DEFAULT NULL,
  p_thumbnail TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE public.stream_recordings
  SET 
    end_time = now(),
    duration = EXTRACT(EPOCH FROM (now() - start_time))::INTEGER,
    file_url = p_file_url,
    file_size = p_file_size,
    thumbnail = p_thumbnail,
    status = 'ready',
    updated_at = now()
  WHERE id = p_recording_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. ATUALIZAR CÂMERAS EXISTENTES COM URLs DE TESTE
-- ============================================

-- Adicionar URLs de stream de teste para câmeras existentes
UPDATE public.cameras
SET 
  stream_url = CASE 
    WHEN name LIKE '%Entrada%' THEN 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    WHEN name LIKE '%Depósito%' THEN 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8'
    ELSE 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
  END,
  stream_protocol = 'hls',
  stream_status = 'disconnected'
WHERE stream_url IS NULL;

-- ============================================
-- 10. COMENTÁRIOS FINAIS
-- ============================================

COMMENT ON TABLE public.stream_recordings IS 'Gravações de streams de câmeras';
COMMENT ON TABLE public.stream_stats IS 'Estatísticas de qualidade dos streams';
COMMENT ON TABLE public.camera_snapshots IS 'Capturas de tela das câmeras';
