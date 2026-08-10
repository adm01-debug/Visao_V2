-- =====================================================================
-- VISÃO v2 — Seed completo para /ppe
-- Projeto: pmzxbffnbenkmzpnbehb
-- User ID: 320f72f4-debc-4092-a4cf-bd4b42dbf3e5 (hardcoded; '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
-- retorna null em sessão SQL do Dashboard)
--
-- COMO RODAR:
--   https://supabase.com/dashboard/project/pmzxbffnbenkmzpnbehb/sql/new
--   Cole TUDO e clique Run.
--
-- Este script é auto-suficiente: cria as tabelas ppe_* caso elas não
-- existam, depois popula com dados de exemplo. Idempotente — pode
-- rodar várias vezes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Tipos enum + colunas de streaming em cameras (se faltarem)
--    Idempotente — pode rodar várias vezes.
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.stream_protocol AS ENUM ('hls','rtsp','webrtc','mjpeg');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stream_status AS ENUM ('active','inactive','error','connecting');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='cameras' AND table_schema='public') THEN
    ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS stream_url       TEXT;
    ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS stream_protocol  public.stream_protocol DEFAULT 'hls';
    ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS stream_status    public.stream_status   DEFAULT 'inactive';
    ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS substream_url    TEXT;
    ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS substream_enabled BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS ptz_capable      BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS user_id          UUID REFERENCES auth.users(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ppe_type' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')) THEN
    CREATE TYPE public.ppe_type AS ENUM ('helmet','vest','goggles','mask','gloves','boots','earmuffs','harness');
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 1. Cria tabelas ppe_* se faltarem
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ppe_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  required_ppe public.ppe_type[] NOT NULL DEFAULT '{}',
  alert_on_violation BOOLEAN DEFAULT true,
  grace_period_seconds INTEGER DEFAULT 5,
  active BOOLEAN DEFAULT true,
  polygon JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ppe_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES public.ppe_zones(id) ON DELETE CASCADE,
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.registered_persons(id) ON DELETE SET NULL,
  missing_items public.ppe_type[] NOT NULL DEFAULT '{}',
  snapshot_url TEXT,
  confidence DECIMAL(5,4) DEFAULT 0,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ---------------------------------------------------------------------
-- 2. RLS (CREATE POLICY não tem IF NOT EXISTS — usa DO block)
-- ---------------------------------------------------------------------
ALTER TABLE public.ppe_zones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppe_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppe_configs    ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- ppe_zones
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ppe_zones' AND policyname='Users can view own ppe_zones') THEN
    CREATE POLICY "Users can view own ppe_zones"   ON public.ppe_zones FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ppe_zones' AND policyname='Users can insert own ppe_zones') THEN
    CREATE POLICY "Users can insert own ppe_zones" ON public.ppe_zones FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ppe_zones' AND policyname='Users can update own ppe_zones') THEN
    CREATE POLICY "Users can update own ppe_zones" ON public.ppe_zones FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ppe_zones' AND policyname='Users can delete own ppe_zones') THEN
    CREATE POLICY "Users can delete own ppe_zones" ON public.ppe_zones FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  -- ppe_violations
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ppe_violations' AND policyname='Anyone can view ppe_violations') THEN
    CREATE POLICY "Anyone can view ppe_violations"     ON public.ppe_violations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ppe_violations' AND policyname='System can insert ppe_violations') THEN
    CREATE POLICY "System can insert ppe_violations"   ON public.ppe_violations FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ppe_violations' AND policyname='Users can update ppe_violations') THEN
    CREATE POLICY "Users can update ppe_violations"     ON public.ppe_violations FOR UPDATE USING (true);
  END IF;

  -- ppe_configs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ppe_configs' AND policyname='Users can view own ppe_configs') THEN
    CREATE POLICY "Users can view own ppe_configs"   ON public.ppe_configs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ppe_configs' AND policyname='Users can insert own ppe_configs') THEN
    CREATE POLICY "Users can insert own ppe_configs" ON public.ppe_configs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ppe_configs' AND policyname='Users can update own ppe_configs') THEN
    CREATE POLICY "Users can update own ppe_configs" ON public.ppe_configs FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ppe_configs' AND policyname='Users can delete own ppe_configs') THEN
    CREATE POLICY "Users can delete own ppe_configs" ON public.ppe_configs FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 3. Limpa registros anteriores (apenas PPE — cameras tem user_id só
-- se a coluna tiver sido adicionada, e é seguro só reinserir).
-- ---------------------------------------------------------------------
DELETE FROM public.ppe_violations WHERE camera_id IN (
  SELECT id FROM public.cameras WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
);

DELETE FROM public.ppe_configs WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid;

DELETE FROM public.ppe_zones WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid;

-- Cria as 3 câmeras (só se não existir同名)
INSERT INTO public.cameras (name, location, status, stream_url, stream_protocol, substream_enabled, ptz_capable, user_id)
SELECT v.name, v.location, 'online'::public.camera_status, v.url, 'rtsp'::public.stream_protocol, false, v.ptz, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
FROM (VALUES
  ('Câmera Almoxarifado',     'Galpão B - Setor de estoque',       'rtsp://demo.local/almoxarifado', false),
  ('Câmera Entrada de Carga', 'Pátio externo - Doca 03',           'rtsp://demo.local/entrada-carga', true),
  ('Câmera Refeitório',       'Bloco C - Refeitório colaboradores', 'rtsp://demo.local/refeitorio',    false)
) AS v(name, location, url, ptz)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cameras c WHERE c.name = v.name AND c.user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
);

-- ---------------------------------------------------------------------
-- 4. Zonas PPE (6 zonas = 2 por câmera)
-- ---------------------------------------------------------------------
WITH cams AS (
  SELECT id, name FROM public.cameras
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
     AND name IN ('Câmera Almoxarifado','Câmera Entrada de Carga','Câmera Refeitório')
)
INSERT INTO public.ppe_zones (
  name, camera_id, required_ppe, alert_on_violation,
  grace_period_seconds, active, polygon, user_id
)
SELECT v.name, c.id, v.required_ppe::public.ppe_type[], true,
       v.grace, true, v.poly::jsonb, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
FROM (VALUES
  ('Câmera Almoxarifado',     'Área de Carga',        ARRAY['helmet','vest','boots']::text[], 5, '[{"x":0.10,"y":0.15},{"x":0.90,"y":0.15},{"x":0.90,"y":0.85},{"x":0.10,"y":0.85}]'),
  ('Câmera Almoxarifado',     'Picking de Pallets',   ARRAY['helmet','vest','gloves']::text[], 8, '[{"x":0.05,"y":0.30},{"x":0.55,"y":0.30},{"x":0.55,"y":0.95},{"x":0.05,"y":0.95}]'),
  ('Câmera Entrada de Carga', 'Doca 03',              ARRAY['helmet','vest','boots']::text[], 4, '[{"x":0.15,"y":0.20},{"x":0.85,"y":0.20},{"x":0.85,"y":0.75},{"x":0.15,"y":0.75}]'),
  ('Câmera Entrada de Carga', 'Triagem de Caminhões', ARRAY['helmet','vest']::text[],         6, '[{"x":0.20,"y":0.10},{"x":0.80,"y":0.10},{"x":0.80,"y":0.60},{"x":0.20,"y":0.60}]'),
  ('Câmera Refeitório',       'Cozinha Industrial',   ARRAY['mask','gloves']::text[],         5, '[{"x":0.10,"y":0.20},{"x":0.90,"y":0.20},{"x":0.90,"y":0.80},{"x":0.10,"y":0.80}]'),
  ('Câmera Refeitório',       'Fila do Refeitório',   ARRAY[]::text[],                        3, '[{"x":0.30,"y":0.40},{"x":0.70,"y":0.40},{"x":0.70,"y":0.90},{"x":0.30,"y":0.90}]')
) AS v(cam_name, name, required_ppe, grace, poly)
JOIN cams c ON c.name = v.cam_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.ppe_zones z WHERE z.name = v.name AND z.user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
);

-- ---------------------------------------------------------------------
-- 5. Configs (1 por câmera)
-- ---------------------------------------------------------------------
INSERT INTO public.ppe_configs (
  camera_id, enabled, min_confidence, detection_interval_ms,
  alert_on_violation, save_violations, grace_period_seconds,
  model_endpoint, user_id
)
SELECT c.id, true, 0.65, 1500, true, true, 5, '/api/ppe-detection', '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
  FROM public.cameras c
 WHERE c.user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
   AND c.name IN ('Câmera Almoxarifado','Câmera Entrada de Carga','Câmera Refeitório')
ON CONFLICT (camera_id) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  min_confidence = EXCLUDED.min_confidence,
  detection_interval_ms = EXCLUDED.detection_interval_ms,
  updated_at = now();

-- ---------------------------------------------------------------------
-- 6. Violações (12 registros, dispersos nas últimas 24h)
-- ---------------------------------------------------------------------
INSERT INTO public.ppe_violations (
  zone_id, camera_id, person_id, missing_items, confidence,
  acknowledged, metadata, created_at
)
SELECT
  z.id,
  z.camera_id,
  NULL,
  v.missing_items::public.ppe_type[],
  v.confidence,
  v.acknowledged,
  jsonb_build_object('tracking_id', v.tracking_id, 'severity', v.severity),
  now() - v.age::interval
FROM (VALUES
  ('Área de Carga',        'person-a01', ARRAY['helmet']::text[],            0.9123, true,  'high',     '2 hours'),
  ('Área de Carga',        'person-a02', ARRAY['vest']::text[],              0.8741, false, 'high',     '1 hour 45 minutes'),
  ('Área de Carga',        'person-a03', ARRAY['helmet','vest']::text[],    0.9502, false, 'critical', '38 minutes'),
  ('Picking de Pallets',   'person-b01', ARRAY['gloves']::text[],            0.8050, true,  'medium',   '3 hours'),
  ('Picking de Pallets',   'person-b02', ARRAY['helmet']::text[],            0.8901, false, 'high',     '1 hour 12 minutes'),
  ('Doca 03',              'person-c01', ARRAY['helmet','boots']::text[],   0.9301, false, 'critical', '15 minutes'),
  ('Doca 03',              'person-c02', ARRAY['vest']::text[],              0.7821, true,  'medium',   '4 hours'),
  ('Triagem de Caminhões', 'person-d01', ARRAY['helmet']::text[],            0.8612, false, 'high',     '52 minutes'),
  ('Triagem de Caminhões', 'person-d02', ARRAY['vest']::text[],              0.8104, true,  'medium',   '5 hours'),
  ('Cozinha Industrial',   'person-e01', ARRAY['mask']::text[],              0.9530, false, 'high',     '23 minutes'),
  ('Cozinha Industrial',   'person-e02', ARRAY['gloves']::text[],            0.8401, false, 'medium',   '1 hour 10 minutes'),
  ('Cozinha Industrial',   'person-e03', ARRAY['mask','gloves']::text[],     0.9220, true,  'high',     '2 hours 30 minutes')
) AS v(zone_name, tracking_id, missing_items, confidence, acknowledged, severity, age)
JOIN public.ppe_zones z
  ON z.name = v.zone_name
 AND z.user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid;

-- ---------------------------------------------------------------------
-- 7. Verificação
-- ---------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM public.cameras WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid)                                      AS cameras,
  (SELECT count(*) FROM public.ppe_zones WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid)                                    AS zones,
  (SELECT count(*) FROM public.ppe_configs WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid)                                  AS configs,
  (SELECT count(*) FROM public.ppe_violations WHERE created_at > now() - interval '24 hours')           AS violations_24h;