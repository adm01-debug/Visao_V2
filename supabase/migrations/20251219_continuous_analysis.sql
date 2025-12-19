-- ============================================
-- VISÃO - Sistema de Vigilância Inteligente
-- Migration: Análise Contínua de Vídeo
-- Data: 2025-12-19
-- ============================================

-- ============================================
-- 1. TABELA: Configurações de Análise Contínua
-- ============================================

CREATE TABLE IF NOT EXISTS public.continuous_analysis_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  
  -- Configuração básica
  name TEXT NOT NULL DEFAULT 'Análise Padrão',
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Tipos de análise
  analysis_types TEXT[] NOT NULL DEFAULT '{security}',
  
  -- Intervalo (ms)
  interval_ms INTEGER NOT NULL DEFAULT 5000 CHECK (interval_ms >= 3000),
  
  -- Agendamento
  schedule_enabled BOOLEAN DEFAULT false,
  schedule_start_time TIME,
  schedule_end_time TIME,
  schedule_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  
  -- Thresholds para alertas
  alert_thresholds JSONB NOT NULL DEFAULT '{
    "minSeverity": "medium",
    "minConfidence": 0.7,
    "maxPeopleCount": null,
    "minPeopleCount": null,
    "minPPECompliance": 90,
    "maxIdleRate": 30
  }'::jsonb,
  
  -- Opções
  save_history BOOLEAN DEFAULT true,
  max_history_size INTEGER DEFAULT 100,
  create_alerts BOOLEAN DEFAULT true,
  
  -- IDs das regras a avaliar
  rule_ids UUID[] DEFAULT '{}',
  
  -- Prioridade (1-10)
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraint único por câmera (uma config ativa por câmera)
  CONSTRAINT unique_active_config_per_camera 
    UNIQUE (camera_id) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_analysis_configs_camera 
ON public.continuous_analysis_configs(camera_id);

CREATE INDEX IF NOT EXISTS idx_analysis_configs_enabled 
ON public.continuous_analysis_configs(enabled) WHERE enabled = true;

-- RLS
ALTER TABLE public.continuous_analysis_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on continuous_analysis_configs"
ON public.continuous_analysis_configs
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_continuous_analysis_configs_updated_at
BEFORE UPDATE ON public.continuous_analysis_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_rules_updated_at();

-- Comentários
COMMENT ON TABLE public.continuous_analysis_configs IS 
'Configurações de análise contínua por câmera';

-- ============================================
-- 2. TABELA: Sessões de Análise
-- ============================================

CREATE TYPE public.analysis_session_status AS ENUM (
  'idle',
  'running',
  'paused',
  'error',
  'stopped',
  'scheduled'
);

CREATE TABLE IF NOT EXISTS public.analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  config_id UUID REFERENCES public.continuous_analysis_configs(id) ON DELETE SET NULL,
  
  -- Status
  status analysis_session_status NOT NULL DEFAULT 'idle',
  
  -- Estatísticas
  total_analyses INTEGER DEFAULT 0,
  successful_analyses INTEGER DEFAULT 0,
  failed_analyses INTEGER DEFAULT 0,
  alerts_generated INTEGER DEFAULT 0,
  total_people_detected INTEGER DEFAULT 0,
  avg_people_per_analysis REAL DEFAULT 0,
  avg_analysis_time_ms INTEGER DEFAULT 0,
  
  -- Erros
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paused_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  last_analysis_at TIMESTAMPTZ,
  next_analysis_at TIMESTAMPTZ,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sessions_camera 
ON public.analysis_sessions(camera_id);

CREATE INDEX IF NOT EXISTS idx_sessions_status 
ON public.analysis_sessions(status);

CREATE INDEX IF NOT EXISTS idx_sessions_started 
ON public.analysis_sessions(started_at DESC);

-- RLS
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on analysis_sessions"
ON public.analysis_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_analysis_sessions_updated_at
BEFORE UPDATE ON public.analysis_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_rules_updated_at();

-- ============================================
-- 3. TABELA: Histórico de Análises
-- ============================================

CREATE TABLE IF NOT EXISTS public.analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  
  -- Tipo de análise
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('security', 'safety', 'productivity')),
  
  -- Resultado
  result JSONB NOT NULL,
  people_count INTEGER DEFAULT 0,
  
  -- Performance
  duration_ms INTEGER NOT NULL,
  
  -- Alertas e regras
  alerts_generated INTEGER DEFAULT 0,
  violated_rules UUID[] DEFAULT '{}',
  
  -- Snapshot (opcional)
  snapshot_url TEXT,
  
  -- Status
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas comuns
CREATE INDEX IF NOT EXISTS idx_history_camera_time 
ON public.analysis_history(camera_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_history_session 
ON public.analysis_history(session_id);

CREATE INDEX IF NOT EXISTS idx_history_type 
ON public.analysis_history(analysis_type);

CREATE INDEX IF NOT EXISTS idx_history_alerts 
ON public.analysis_history(alerts_generated) WHERE alerts_generated > 0;

-- Índice parcial para análises com erro
CREATE INDEX IF NOT EXISTS idx_history_errors 
ON public.analysis_history(camera_id, created_at DESC) 
WHERE success = false;

-- RLS
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on analysis_history"
ON public.analysis_history
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- 4. TABELA: Violações de Regras
-- ============================================

CREATE TABLE IF NOT EXISTS public.rule_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analysis_history(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.rules(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  
  -- Detalhes da violação
  conditions_evaluated JSONB NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  
  -- Ações executadas
  actions_taken TEXT[] DEFAULT '{}',
  alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_violations_analysis 
ON public.rule_violations(analysis_id);

CREATE INDEX IF NOT EXISTS idx_violations_rule 
ON public.rule_violations(rule_id);

CREATE INDEX IF NOT EXISTS idx_violations_camera_time 
ON public.rule_violations(camera_id, created_at DESC);

-- RLS
ALTER TABLE public.rule_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on rule_violations"
ON public.rule_violations
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- 5. FUNÇÕES RPC
-- ============================================

-- Função: Iniciar sessão de análise
CREATE OR REPLACE FUNCTION public.start_analysis_session(
  p_camera_id UUID,
  p_config_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Parar sessões anteriores da mesma câmera
  UPDATE public.analysis_sessions
  SET 
    status = 'stopped',
    stopped_at = now(),
    updated_at = now()
  WHERE camera_id = p_camera_id 
    AND status IN ('running', 'paused', 'scheduled');

  -- Criar nova sessão
  INSERT INTO public.analysis_sessions (
    camera_id,
    config_id,
    status,
    started_at
  ) VALUES (
    p_camera_id,
    p_config_id,
    'running',
    now()
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Atualizar estatísticas da sessão
CREATE OR REPLACE FUNCTION public.update_session_stats(
  p_session_id UUID,
  p_success BOOLEAN,
  p_people_count INTEGER DEFAULT 0,
  p_alerts_generated INTEGER DEFAULT 0,
  p_analysis_time_ms INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  UPDATE public.analysis_sessions
  SET
    total_analyses = total_analyses + 1,
    successful_analyses = successful_analyses + CASE WHEN p_success THEN 1 ELSE 0 END,
    failed_analyses = failed_analyses + CASE WHEN NOT p_success THEN 1 ELSE 0 END,
    alerts_generated = alerts_generated + p_alerts_generated,
    total_people_detected = total_people_detected + p_people_count,
    avg_people_per_analysis = (total_people_detected + p_people_count)::REAL / (total_analyses + 1),
    avg_analysis_time_ms = (avg_analysis_time_ms * total_analyses + p_analysis_time_ms) / (total_analyses + 1),
    last_analysis_at = now(),
    updated_at = now()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Obter estatísticas agregadas por câmera
CREATE OR REPLACE FUNCTION public.get_camera_analysis_stats(
  p_camera_id UUID,
  p_period_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  total_analyses BIGINT,
  successful_analyses BIGINT,
  alerts_generated BIGINT,
  avg_people REAL,
  avg_duration_ms REAL,
  top_analysis_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_analyses,
    COUNT(*) FILTER (WHERE success)::BIGINT as successful_analyses,
    SUM(alerts_generated)::BIGINT as alerts_generated,
    AVG(people_count)::REAL as avg_people,
    AVG(duration_ms)::REAL as avg_duration_ms,
    MODE() WITHIN GROUP (ORDER BY analysis_type) as top_analysis_type
  FROM public.analysis_history
  WHERE camera_id = p_camera_id
    AND created_at >= now() - (p_period_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Limpar histórico antigo
CREATE OR REPLACE FUNCTION public.cleanup_old_analysis_history(
  p_days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.analysis_history
  WHERE created_at < now() - (p_days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. VIEW: Dashboard de Análise Contínua
-- ============================================

CREATE OR REPLACE VIEW public.analysis_dashboard AS
SELECT 
  c.id as camera_id,
  c.name as camera_name,
  c.location as camera_location,
  c.status as camera_status,
  
  -- Sessão ativa
  s.id as session_id,
  s.status as session_status,
  s.total_analyses,
  s.alerts_generated as session_alerts,
  s.started_at as session_started,
  s.last_analysis_at,
  
  -- Última análise
  h.analysis_type as last_analysis_type,
  h.people_count as last_people_count,
  h.duration_ms as last_duration_ms,
  h.success as last_success,
  h.created_at as last_analysis_time,
  
  -- Configuração
  cfg.enabled as config_enabled,
  cfg.interval_ms as config_interval,
  cfg.analysis_types as config_types
  
FROM public.cameras c
LEFT JOIN LATERAL (
  SELECT * FROM public.analysis_sessions
  WHERE camera_id = c.id
  ORDER BY started_at DESC
  LIMIT 1
) s ON true
LEFT JOIN LATERAL (
  SELECT * FROM public.analysis_history
  WHERE camera_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) h ON true
LEFT JOIN public.continuous_analysis_configs cfg 
  ON cfg.camera_id = c.id;

-- ============================================
-- 7. TRIGGER: Criar alerta automático para violações críticas
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_create_alert_on_violation()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar alerta apenas para violações críticas ou altas
  IF NEW.severity IN ('critical', 'high') THEN
    INSERT INTO public.alerts (
      camera_id,
      camera_name,
      type,
      severity,
      message,
      is_read
    )
    SELECT 
      NEW.camera_id,
      c.name,
      'security',
      NEW.severity,
      NEW.message,
      false
    FROM public.cameras c
    WHERE c.id = NEW.camera_id;
    
    -- Atualizar contagem de alertas da câmera
    UPDATE public.cameras
    SET alerts_count = alerts_count + 1
    WHERE id = NEW.camera_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_alert_on_rule_violation
AFTER INSERT ON public.rule_violations
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_alert_on_violation();

-- ============================================
-- 8. POLÍTICAS DE RETENÇÃO
-- ============================================

-- Comentário sobre retenção
COMMENT ON TABLE public.analysis_history IS 
'Histórico de análises. Usar cleanup_old_analysis_history() para limpar dados antigos.
Recomendação: Agendar limpeza de dados > 30 dias via cron job ou pg_cron.';

-- ============================================
-- 9. ÍNDICES PARA DASHBOARD
-- ============================================

-- Índice para busca de sessões ativas
CREATE INDEX IF NOT EXISTS idx_active_sessions
ON public.analysis_sessions(camera_id, status)
WHERE status IN ('running', 'paused');

-- Índice para histórico recente (últimas 24h)
CREATE INDEX IF NOT EXISTS idx_recent_history
ON public.analysis_history(camera_id, created_at DESC)
WHERE created_at > now() - INTERVAL '24 hours';
