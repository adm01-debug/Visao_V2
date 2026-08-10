-- ============================================
-- VISÃO - Sistema de Vigilância Inteligente
-- Migration: Zonas de Interesse (GAP #5)
-- ============================================

-- 1. TIPOS ENUM
DO $$ BEGIN
  CREATE TYPE public.zone_shape AS ENUM ('polygon', 'rectangle', 'circle', 'line');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.zone_type AS ENUM (
    'restricted', 'counting', 'tripwire', 'dwell', 
    'occupancy', 'parking', 'queue', 'safety', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.zone_event_type AS ENUM (
    'enter', 'exit', 'cross_line', 'dwell_time', 'occupancy',
    'count_in', 'count_out', 'crowd_density', 'loitering',
    'wrong_direction', 'ppe_violation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TABELA: Zonas de Interesse
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

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on zones" ON public.zones FOR ALL USING (true) WITH CHECK (true);

-- 3. TABELA: Eventos de Zona
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

ALTER TABLE public.zone_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on zone_events" ON public.zone_events FOR ALL USING (true) WITH CHECK (true);

-- 4. FUNÇÕES RPC

-- Criar zona
CREATE OR REPLACE FUNCTION public.create_zone(
  p_camera_id UUID, p_name TEXT, p_type zone_type,
  p_geometry JSONB, p_color TEXT DEFAULT '#3B82F6', p_config JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE v_zone_id UUID;
BEGIN
  INSERT INTO public.zones (camera_id, name, type, geometry, color, config, enabled)
  VALUES (p_camera_id, p_name, p_type, p_geometry, p_color, p_config, true)
  RETURNING id INTO v_zone_id;
  RETURN v_zone_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Registrar evento de zona
CREATE OR REPLACE FUNCTION public.record_zone_event(
  p_zone_id UUID, p_event_type zone_event_type,
  p_object_id TEXT DEFAULT NULL, p_value REAL DEFAULT NULL,
  p_generate_alert BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE v_event_id UUID; v_zone RECORD; v_alert_id UUID;
BEGIN
  SELECT * INTO v_zone FROM public.zones WHERE id = p_zone_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Zona não encontrada'; END IF;
  
  IF p_generate_alert THEN
    INSERT INTO public.alerts (camera_name, type, severity, message, is_read)
    VALUES (
      (SELECT name FROM public.cameras WHERE id = v_zone.camera_id),
      'zone',
      CASE WHEN v_zone.type IN ('restricted', 'safety') THEN 'high' ELSE 'medium' END,
      v_zone.name || ': ' || p_event_type::TEXT,
      false
    ) RETURNING id INTO v_alert_id;
  END IF;
  
  INSERT INTO public.zone_events (zone_id, zone_name, camera_id, event_type, object_id, value, alert_generated, alert_id)
  VALUES (p_zone_id, v_zone.name, v_zone.camera_id::TEXT, p_event_type, p_object_id, p_value, p_generate_alert, v_alert_id)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
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

-- Limpar eventos antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_zone_events(p_days INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE v_deleted INTEGER;
BEGIN
  DELETE FROM public.zone_events WHERE created_at < now() - (p_days || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. VIEW: Dashboard de zonas
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

-- 6. TRIGGER: Updated_at
CREATE OR REPLACE FUNCTION update_zones_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER update_zones_timestamp
BEFORE UPDATE ON public.zones FOR EACH ROW EXECUTE FUNCTION update_zones_updated_at();
