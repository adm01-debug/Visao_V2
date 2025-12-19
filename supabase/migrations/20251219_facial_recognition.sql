-- ============================================
-- VISÃO - Sistema de Vigilância Inteligente
-- Migration: Reconhecimento Facial (GAP #4)
-- Data: 2025-12-19
-- ============================================

-- ============================================
-- 1. TIPOS ENUM
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.person_list_type AS ENUM (
    'whitelist', 'blacklist', 'vip', 'employee', 'visitor', 'contractor', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.person_status AS ENUM (
    'active', 'inactive', 'blocked', 'pending'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. TABELA: Pessoas Cadastradas
-- ============================================

CREATE TABLE IF NOT EXISTS public.registered_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados pessoais
  name TEXT NOT NULL,
  document TEXT,
  document_type TEXT DEFAULT 'cpf',
  email TEXT,
  phone TEXT,
  
  -- Empresa
  company TEXT,
  department TEXT,
  role TEXT,
  
  -- Classificação
  list_type person_list_type NOT NULL DEFAULT 'visitor',
  status person_status NOT NULL DEFAULT 'active',
  
  -- Fotos
  photo_url TEXT,
  training_photos TEXT[] DEFAULT '{}',
  
  -- Encoding facial (vetor de características)
  face_encoding REAL[],
  encoding_quality REAL,
  
  -- Organização
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  
  -- Controle de acesso
  access_schedule JSONB,
  allowed_cameras TEXT[] DEFAULT '{}',
  
  -- Estatísticas
  last_seen_at TIMESTAMPTZ,
  last_seen_camera_id TEXT,
  last_seen_camera_name TEXT,
  recognition_count INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_persons_name ON public.registered_persons(name);
CREATE INDEX IF NOT EXISTS idx_persons_list_type ON public.registered_persons(list_type);
CREATE INDEX IF NOT EXISTS idx_persons_status ON public.registered_persons(status);
CREATE INDEX IF NOT EXISTS idx_persons_company ON public.registered_persons(company);
CREATE INDEX IF NOT EXISTS idx_persons_document ON public.registered_persons(document);

-- Índice para busca por encoding (aproximação)
CREATE INDEX IF NOT EXISTS idx_persons_has_encoding 
ON public.registered_persons(id) 
WHERE face_encoding IS NOT NULL;

-- RLS
ALTER TABLE public.registered_persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on registered_persons" 
ON public.registered_persons FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 3. TABELA: Logs de Reconhecimento
-- ============================================

CREATE TABLE IF NOT EXISTS public.recognition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Câmera
  camera_id TEXT NOT NULL,
  camera_name TEXT NOT NULL,
  
  -- Pessoa (se reconhecida)
  person_id UUID REFERENCES public.registered_persons(id) ON DELETE SET NULL,
  person_name TEXT,
  list_type person_list_type,
  
  -- Resultado
  similarity REAL,
  is_known BOOLEAN NOT NULL DEFAULT false,
  action TEXT,
  
  -- Imagens
  face_snapshot TEXT,
  frame_snapshot TEXT,
  bounding_box JSONB,
  
  -- Atributos
  attributes JSONB,
  
  -- Alerta
  alert_generated BOOLEAN DEFAULT false,
  alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_logs_camera ON public.recognition_logs(camera_id);
CREATE INDEX IF NOT EXISTS idx_logs_person ON public.recognition_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON public.recognition_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_is_known ON public.recognition_logs(is_known);
CREATE INDEX IF NOT EXISTS idx_logs_list_type ON public.recognition_logs(list_type);
CREATE INDEX IF NOT EXISTS idx_logs_alert ON public.recognition_logs(alert_generated) WHERE alert_generated = true;

-- RLS
ALTER TABLE public.recognition_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on recognition_logs" 
ON public.recognition_logs FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 4. TABELA: Configuração de Reconhecimento
-- ============================================

CREATE TABLE IF NOT EXISTS public.face_recognition_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id TEXT, -- NULL = global
  
  enabled BOOLEAN DEFAULT true,
  match_threshold REAL DEFAULT 0.6,
  min_face_quality REAL DEFAULT 0.5,
  min_face_size INTEGER DEFAULT 80,
  detect_multiple_faces BOOLEAN DEFAULT true,
  max_faces_per_frame INTEGER DEFAULT 10,
  
  -- Ações por tipo
  actions JSONB DEFAULT '{
    "whitelist": "allow",
    "blacklist": "alert",
    "vip": "notify",
    "employee": "log",
    "visitor": "log",
    "unknown": "log"
  }'::jsonb,
  
  alert_on_unknown BOOLEAN DEFAULT false,
  alert_cooldown INTEGER DEFAULT 60,
  save_unknown_faces BOOLEAN DEFAULT true,
  check_access_schedule BOOLEAN DEFAULT false,
  check_allowed_cameras BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.face_recognition_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on face_recognition_configs" 
ON public.face_recognition_configs FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 5. FUNÇÕES RPC
-- ============================================

-- Registrar nova pessoa
CREATE OR REPLACE FUNCTION public.register_person(
  p_name TEXT,
  p_list_type person_list_type DEFAULT 'visitor',
  p_photo_url TEXT DEFAULT NULL,
  p_document TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_person_id UUID;
BEGIN
  INSERT INTO public.registered_persons (
    name, list_type, photo_url, document, company, email, phone, status
  ) VALUES (
    p_name, p_list_type, p_photo_url, p_document, p_company, p_email, p_phone, 'active'
  )
  RETURNING id INTO v_person_id;
  
  RETURN v_person_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar último acesso
CREATE OR REPLACE FUNCTION public.update_person_last_seen(
  p_person_id UUID,
  p_camera_id TEXT,
  p_camera_name TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE public.registered_persons
  SET 
    last_seen_at = now(),
    last_seen_camera_id = p_camera_id,
    last_seen_camera_name = p_camera_name,
    recognition_count = recognition_count + 1
  WHERE id = p_person_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buscar pessoas por tipo de lista
CREATE OR REPLACE FUNCTION public.get_persons_by_list_type(
  p_list_type person_list_type
)
RETURNS SETOF public.registered_persons AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.registered_persons
  WHERE list_type = p_list_type AND status = 'active'
  ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Estatísticas de reconhecimento
CREATE OR REPLACE FUNCTION public.get_recognition_stats(
  p_camera_id TEXT DEFAULT NULL,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  total_detections BIGINT,
  known_count BIGINT,
  unknown_count BIGINT,
  alerts_count BIGINT,
  by_list_type JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_detections,
    COUNT(*) FILTER (WHERE is_known)::BIGINT as known_count,
    COUNT(*) FILTER (WHERE NOT is_known)::BIGINT as unknown_count,
    COUNT(*) FILTER (WHERE alert_generated)::BIGINT as alerts_count,
    jsonb_object_agg(
      COALESCE(list_type::TEXT, 'unknown'),
      cnt
    ) as by_list_type
  FROM (
    SELECT 
      list_type,
      COUNT(*) as cnt
    FROM public.recognition_logs
    WHERE (p_camera_id IS NULL OR camera_id = p_camera_id)
      AND created_at >= now() - (p_hours || ' hours')::INTERVAL
    GROUP BY list_type
  ) sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Limpar logs antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_recognition_logs(
  p_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.recognition_logs
  WHERE created_at < now() - (p_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. VIEWS
-- ============================================

-- Dashboard de reconhecimento
CREATE OR REPLACE VIEW public.face_recognition_dashboard AS
SELECT 
  c.id as camera_id,
  c.name as camera_name,
  COUNT(rl.id) as total_recognitions,
  COUNT(rl.id) FILTER (WHERE rl.is_known) as known_count,
  COUNT(rl.id) FILTER (WHERE NOT rl.is_known) as unknown_count,
  COUNT(rl.id) FILTER (WHERE rl.alert_generated) as alerts_count,
  MAX(rl.created_at) as last_recognition_at
FROM public.cameras c
LEFT JOIN public.recognition_logs rl ON rl.camera_id = c.id::TEXT
  AND rl.created_at >= now() - INTERVAL '24 hours'
GROUP BY c.id, c.name;

-- Pessoas mais vistas
CREATE OR REPLACE VIEW public.most_seen_persons AS
SELECT 
  p.id,
  p.name,
  p.photo_url,
  p.list_type,
  p.company,
  p.recognition_count,
  p.last_seen_at,
  p.last_seen_camera_name
FROM public.registered_persons p
WHERE p.status = 'active'
ORDER BY p.recognition_count DESC
LIMIT 20;

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Atualizar timestamp
CREATE OR REPLACE FUNCTION update_face_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_registered_persons_timestamp
BEFORE UPDATE ON public.registered_persons
FOR EACH ROW EXECUTE FUNCTION update_face_updated_at();

CREATE TRIGGER update_face_configs_timestamp
BEFORE UPDATE ON public.face_recognition_configs
FOR EACH ROW EXECUTE FUNCTION update_face_updated_at();

-- Auto-criar alerta para blacklist
CREATE OR REPLACE FUNCTION auto_alert_on_blacklist()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.list_type = 'blacklist' AND NEW.is_known = true THEN
    INSERT INTO public.alerts (
      camera_name, type, severity, message, is_read
    ) VALUES (
      NEW.camera_name,
      'access',
      'critical',
      'ALERTA: Pessoa bloqueada detectada - ' || COALESCE(NEW.person_name, 'Desconhecido'),
      false
    );
    
    NEW.alert_generated := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_alert_blacklist
BEFORE INSERT ON public.recognition_logs
FOR EACH ROW
EXECUTE FUNCTION auto_alert_on_blacklist();

-- ============================================
-- 8. DADOS INICIAIS
-- ============================================

-- Configuração global padrão
INSERT INTO public.face_recognition_configs (camera_id, enabled)
VALUES (NULL, true)
ON CONFLICT DO NOTHING;
