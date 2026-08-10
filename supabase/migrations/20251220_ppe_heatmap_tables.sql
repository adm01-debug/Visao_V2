-- ============================================
-- VISÃO - Sistema de Vigilância Inteligente
-- Migration: Tabelas de Detecção de EPIs (PPE)
-- ============================================

-- ============================================
-- ENUM: Tipos de EPI
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.ppe_type AS ENUM (
    'helmet',     -- Capacete
    'vest',       -- Colete reflexivo
    'goggles',    -- Óculos de proteção
    'mask',       -- Máscara facial
    'gloves',     -- Luvas
    'boots',      -- Botas de segurança
    'earmuffs',   -- Protetor auricular
    'harness'     -- Cinto de segurança
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TABELA: ppe_zones (Zonas que requerem EPIs)
-- ============================================

CREATE TABLE IF NOT EXISTS public.ppe_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  required_ppe ppe_type[] NOT NULL DEFAULT '{}',
  alert_on_violation BOOLEAN DEFAULT true,
  grace_period_seconds INTEGER DEFAULT 5,
  active BOOLEAN DEFAULT true,
  polygon JSONB, -- Coordenadas da zona [{"x": 0, "y": 0}, ...]
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ppe_zones_camera ON public.ppe_zones(camera_id);
CREATE INDEX IF NOT EXISTS idx_ppe_zones_active ON public.ppe_zones(active);

-- RLS
ALTER TABLE public.ppe_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ppe_zones"
  ON public.ppe_zones FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own ppe_zones"
  ON public.ppe_zones FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own ppe_zones"
  ON public.ppe_zones FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own ppe_zones"
  ON public.ppe_zones FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- TABELA: ppe_violations (Violações de EPI)
-- ============================================

CREATE TABLE IF NOT EXISTS public.ppe_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES public.ppe_zones(id) ON DELETE CASCADE,
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.registered_persons(id) ON DELETE SET NULL,
  missing_items ppe_type[] NOT NULL DEFAULT '{}',
  snapshot_url TEXT,
  confidence DECIMAL(5,4) DEFAULT 0,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ppe_violations_zone ON public.ppe_violations(zone_id);
CREATE INDEX IF NOT EXISTS idx_ppe_violations_camera ON public.ppe_violations(camera_id);
CREATE INDEX IF NOT EXISTS idx_ppe_violations_person ON public.ppe_violations(person_id);
CREATE INDEX IF NOT EXISTS idx_ppe_violations_acknowledged ON public.ppe_violations(acknowledged);
CREATE INDEX IF NOT EXISTS idx_ppe_violations_created ON public.ppe_violations(created_at DESC);

-- RLS
ALTER TABLE public.ppe_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ppe_violations"
  ON public.ppe_violations FOR SELECT
  USING (true);

CREATE POLICY "System can insert ppe_violations"
  ON public.ppe_violations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update ppe_violations"
  ON public.ppe_violations FOR UPDATE
  USING (true);

-- ============================================
-- TABELA: ppe_configs (Configurações de detecção)
-- ============================================

CREATE TABLE IF NOT EXISTS public.ppe_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN DEFAULT true,
  min_confidence DECIMAL(3,2) DEFAULT 0.60,
  detection_interval_ms INTEGER DEFAULT 2000,
  alert_on_violation BOOLEAN DEFAULT true,
  save_violations BOOLEAN DEFAULT true,
  grace_period_seconds INTEGER DEFAULT 5,
  model_endpoint TEXT DEFAULT '/api/ppe-detection',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.ppe_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ppe_configs"
  ON public.ppe_configs FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- TABELA: heatmap_data (Dados de mapa de calor)
-- ============================================

CREATE TABLE IF NOT EXISTS public.heatmap_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  value DECIMAL(10,4) DEFAULT 1,
  grid_size INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice composto para queries eficientes
CREATE INDEX IF NOT EXISTS idx_heatmap_data_camera_time 
  ON public.heatmap_data(camera_id, created_at DESC);

-- Particionamento por tempo (opcional, para grandes volumes)
-- CREATE INDEX IF NOT EXISTS idx_heatmap_data_time ON public.heatmap_data(created_at);

-- RLS
ALTER TABLE public.heatmap_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view heatmap_data"
  ON public.heatmap_data FOR SELECT USING (true);

CREATE POLICY "System can insert heatmap_data"
  ON public.heatmap_data FOR INSERT WITH CHECK (true);

-- ============================================
-- TABELA: heatmap_snapshots (Snapshots agregados)
-- ============================================

CREATE TABLE IF NOT EXISTS public.heatmap_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  data JSONB NOT NULL, -- Grid 2D comprimido
  total_detections INTEGER DEFAULT 0,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_heatmap_snapshots_camera_time 
  ON public.heatmap_snapshots(camera_id, start_time DESC);

-- RLS
ALTER TABLE public.heatmap_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view heatmap_snapshots"
  ON public.heatmap_snapshots FOR SELECT USING (true);

CREATE POLICY "System can insert heatmap_snapshots"
  ON public.heatmap_snapshots FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNÇÃO: Limpar dados antigos de heatmap
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_heatmap_data()
RETURNS void AS $$
BEGIN
  -- Manter apenas últimos 7 dias de dados granulares
  DELETE FROM public.heatmap_data 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Manter snapshots por 90 dias
  DELETE FROM public.heatmap_snapshots 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Atualizar updated_at automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para ppe_zones
DROP TRIGGER IF EXISTS update_ppe_zones_updated_at ON public.ppe_zones;
CREATE TRIGGER update_ppe_zones_updated_at
  BEFORE UPDATE ON public.ppe_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para ppe_configs
DROP TRIGGER IF EXISTS update_ppe_configs_updated_at ON public.ppe_configs;
CREATE TRIGGER update_ppe_configs_updated_at
  BEFORE UPDATE ON public.ppe_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.ppe_zones IS 'Zonas que requerem uso de EPIs específicos';
COMMENT ON TABLE public.ppe_violations IS 'Registro de violações de uso de EPI';
COMMENT ON TABLE public.ppe_configs IS 'Configurações de detecção de EPI por câmera';
COMMENT ON TABLE public.heatmap_data IS 'Dados granulares de mapa de calor';
COMMENT ON TABLE public.heatmap_snapshots IS 'Snapshots agregados de mapa de calor';
