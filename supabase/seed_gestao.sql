-- =====================================================================
-- VISÃO v2 — Seed módulo Gestão (12 sub-páginas que precisam de banco)
-- Projeto: pmzxbffnbenkmzpnbehb
-- User ID: 320f72f4-debc-4092-a4cf-bd4b42dbf3e5
--
-- Páginas cobertas:
--   /colaboradores, /pessoas        — usa registered_persons (já populado)
--   /zonas                          — zones + zone_events
--   /produtividade                  — mock determinístico (sem seed)
--   /jornada                        — persons + zones + zone_events
--   /fluxo                          — zones + zone_events
--   /metas-kpis                     — mock determinístico (sem seed)
--   /rede-colaborativa              — collab_networks + memberships + invitations
--   /planta-baixa                   — site_plans + site_plan_placements
--   /registro-probatorio            — evidence_exports
--   /usuarios                       — user_roles
--   /cobertura                      — local file (sem seed)
--   /conferencia-atestado           — user input (sem seed)
--
-- Idempotente: limpa registros do seu user antes de inserir.
-- Schema baseado em src/integrations/supabase/types.ts (que diverge da
-- migration 20251219_zones.sql — o app lê o schema do types.ts).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Defensive: ensure user is member of an organization (idempotente)
--    Necessário para collab_networks.owner_org_id e collab_invitations
-- ---------------------------------------------------------------------
DO $$
DECLARE v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
    FROM public.organization_members
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
   LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES ('VISÃO Demo', 'visao-demo', '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid)
    RETURNING id INTO v_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 1. ZONAS (zones) — schema do types.ts (points, is_active, user_id, type TEXT)
--    O hook em useZonesState.ts usa is_active + points + camera_id nullable.
-- ---------------------------------------------------------------------

-- Ensure zones table matches the schema the app expects. CREATE TABLE IF NOT EXISTS
-- is no-op if the table already exists with a different shape, so we ALTER
-- columns to match the types.ts schema.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='zones' AND table_schema='public') THEN
    -- Adiciona colunas que podem estar faltando (cada uma isolada pra um erro não bloquear as outras)
    BEGIN ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS points JSONB; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS color TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS name TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Backfill defensivo: cada um em sua própria transação pra erro não bloquear
    BEGIN
      UPDATE public.zones SET points = COALESCE(points, '[]'::jsonb) WHERE points IS NULL;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    BEGIN
      UPDATE public.zones SET is_active = COALESCE(is_active, true) WHERE is_active IS NULL;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    BEGIN
      UPDATE public.zones SET color = COALESCE(color, '#3B82F6') WHERE color IS NULL;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Garante RLS permissivo
    ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all on zones" ON public.zones;
    CREATE POLICY "Allow all on zones" ON public.zones FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;

-- Schema canônico para zonas
CREATE TABLE IF NOT EXISTS public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID REFERENCES public.cameras(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  points JSONB DEFAULT '[]'::jsonb,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- zone_events schema compatível com o hook (usa event_type, timestamp, zone_id, detected_objects)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='zone_events' AND table_schema='public') THEN
    BEGIN ALTER TABLE public.zone_events ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.zone_events ADD COLUMN IF NOT EXISTS detected_objects JSONB; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.zone_events ADD COLUMN IF NOT EXISTS zone_id UUID; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.zone_events ADD COLUMN IF NOT EXISTS event_type TEXT; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE public.zone_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id); EXCEPTION WHEN OTHERS THEN NULL; END;
    ALTER TABLE public.zone_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all on zone_events" ON public.zone_events;
    CREATE POLICY "Allow all on zone_events" ON public.zone_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.zone_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_objects JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zone_events_zone ON public.zone_events(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_events_timestamp ON public.zone_events(timestamp DESC);

-- Limpa registros antigos do user
DELETE FROM public.zone_events WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid;
DELETE FROM public.zones WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid;

-- Insere 8 zonas (2 por câmera das 4 primeiras que encontrar)
WITH cams AS (
  SELECT id, name FROM public.cameras
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
   ORDER BY name
   LIMIT 4
),
new_zones AS (
  INSERT INTO public.zones (
    name, type, camera_id, points, color, is_active, user_id
  )
  SELECT
    v.name, v.type, c.id, v.points::jsonb, v.color, true, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
  FROM cams c
  CROSS JOIN LATERAL (
    VALUES
      -- tipos válidos: 'restricted','counting','heatmap','entry','exit','safe'
      ('Área de Carga Restrita',  'restricted', '[{"x":0.1,"y":0.2},{"x":0.4,"y":0.2},{"x":0.4,"y":0.7},{"x":0.1,"y":0.7}]', '#EF4444'),
      ('Ponto de Contagem Norte', 'counting',   '[{"x":0.5,"y":0.1},{"x":0.55,"y":0.1},{"x":0.55,"y":0.9},{"x":0.5,"y":0.9}]', '#10B981'),
      ('Mapa de Calor Recepção',  'heatmap',    '[{"x":0.6,"y":0.15},{"x":0.9,"y":0.15},{"x":0.9,"y":0.85},{"x":0.6,"y":0.85}]', '#F59E0B'),
      ('Entrada de Funcionários', 'entry',      '[{"x":0.05,"y":0.05},{"x":0.35,"y":0.05},{"x":0.35,"y":0.4},{"x":0.05,"y":0.4}]', '#3B82F6'),
      ('Saída de Veículos',       'exit',       '[{"x":0.4,"y":0.5},{"x":0.6,"y":0.5},{"x":0.6,"y":0.95},{"x":0.4,"y":0.95}]', '#8B5CF6'),
      ('Doca Segura',             'safe',       '[{"x":0.7,"y":0.3},{"x":0.95,"y":0.3},{"x":0.95,"y":0.8},{"x":0.7,"y":0.8}]', '#EC4899'),
      ('Zona Restrita Galpão',    'restricted', '[{"x":0.3,"y":0.4},{"x":0.65,"y":0.4},{"x":0.65,"y":0.6},{"x":0.3,"y":0.6}]', '#06B6D4'),
      ('Contagem de Pallets',     'counting',   '[{"x":0.15,"y":0.5},{"x":0.25,"y":0.5},{"x":0.25,"y":0.95},{"x":0.15,"y":0.95}]', '#84CC16')
  ) AS v(name, type, points, color)
  RETURNING id, name
)
SELECT count(*) FROM new_zones;

-- Insere ~100 zone_events distribuídos nas últimas 24h
INSERT INTO public.zone_events (zone_id, event_type, timestamp, detected_objects, user_id)
SELECT
  z.id,
  CASE (random() * 6)::int
    WHEN 0 THEN 'enter'
    WHEN 1 THEN 'exit'
    WHEN 2 THEN 'count_in'
    WHEN 3 THEN 'count_out'
    WHEN 4 THEN 'cross_line'
    ELSE 'dwell_time'
  END,
  now() - (random() * interval '24 hours'),
  jsonb_build_object('count', 1 + (random() * 5)::int, 'object_type', 'person'),
  '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
FROM public.zones z
CROSS JOIN generate_series(1, 12);

-- ---------------------------------------------------------------------
-- 2. REDE COLABORATIVA — collab_networks + collab_memberships + collab_invitations
-- ---------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='collab_networks' AND table_schema='public') THEN
    CREATE TABLE public.collab_networks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      owner_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
      reciprocity_required BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='collab_memberships' AND table_schema='public') THEN
    CREATE TABLE public.collab_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      network_id UUID NOT NULL REFERENCES public.collab_networks(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active',
      shares_data BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (network_id, organization_id)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='collab_invitations' AND table_schema='public') THEN
    CREATE TABLE public.collab_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      network_id UUID NOT NULL REFERENCES public.collab_networks(id) ON DELETE CASCADE,
      invited_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
      invited_by UUID REFERENCES auth.users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      ttl_days INTEGER NOT NULL DEFAULT 14,
      expires_at TIMESTAMPTZ NOT NULL,
      responded_at TIMESTAMPTZ,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END$$;

ALTER TABLE public.collab_networks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_memberships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_invitations  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='collab_networks' AND policyname='Users can view own networks') THEN
    CREATE POLICY "Users can view own networks" ON public.collab_networks FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='collab_memberships' AND policyname='Users can view memberships') THEN
    CREATE POLICY "Users can view memberships" ON public.collab_memberships FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='collab_invitations' AND policyname='Users can view invitations') THEN
    CREATE POLICY "Users can view invitations" ON public.collab_invitations FOR SELECT USING (true);
  END IF;
END$$;

-- Limpa redes da sua org (cuidado: outras orgs também podem ter)
DELETE FROM public.collab_invitations WHERE network_id IN (
  SELECT id FROM public.collab_networks WHERE owner_org_id IN (
    SELECT organization_id FROM public.organization_members
     WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
  )
);
DELETE FROM public.collab_memberships WHERE network_id IN (
  SELECT id FROM public.collab_networks WHERE owner_org_id IN (
    SELECT organization_id FROM public.organization_members
     WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
  )
);
DELETE FROM public.collab_networks WHERE owner_org_id IN (
  SELECT organization_id FROM public.organization_members
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
);

-- 2 redes demo
WITH my_org AS (
  SELECT organization_id FROM public.organization_members
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid LIMIT 1
)
INSERT INTO public.collab_networks (name, slug, owner_org_id, reciprocity_required)
SELECT * FROM (
  VALUES
    ('Rede SP Segurança', 'rede-sp-seguranca', (SELECT organization_id FROM my_org), true),
    ('Rede Brasil Logístico', 'rede-br-logistico', (SELECT organization_id FROM my_org), false)
) AS v(name, slug, owner_org_id, reciprocity_required);

-- Memberships (a própria org em ambas as redes)
INSERT INTO public.collab_memberships (network_id, organization_id, status, shares_data)
SELECT n.id,
       (SELECT organization_id FROM public.organization_members
         WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid LIMIT 1),
       'active', true
FROM public.collab_networks n
WHERE n.slug IN ('rede-sp-seguranca','rede-br-logistico')
ON CONFLICT (network_id, organization_id) DO NOTHING;

-- Convites fictícios (precisam de orgs convidadas — criamos 2 fictícias temporárias)
DO $$
DECLARE
  v_guest1 UUID;
  v_guest2 UUID;
  v_net1   UUID;
  v_net2   UUID;
BEGIN
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES ('Convidada Alpha', 'convidada-alpha', '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid)
  RETURNING id INTO v_guest1;

  INSERT INTO public.organizations (name, slug, created_by)
  VALUES ('Convidada Beta', 'convidada-beta', '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid)
  RETURNING id INTO v_guest2;

  SELECT id INTO v_net1 FROM public.collab_networks WHERE slug = 'rede-sp-seguranca';
  SELECT id INTO v_net2 FROM public.collab_networks WHERE slug = 'rede-br-logistico';

  INSERT INTO public.collab_invitations (network_id, invited_org_id, invited_by, status, ttl_days, expires_at, note)
  VALUES
    (v_net1, v_guest1, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'pending', 14, now() + interval '14 days', 'Compartilhar lista de placas restritas'),
    (v_net1, v_guest2, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'accepted', 14, now() + interval '14 days', 'Convite aceito na semana passada'),
    (v_net2, v_guest1, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'pending', 7,  now() + interval '7 days',  'Compartilhar eventos de aglomeração');
END$$;

-- ---------------------------------------------------------------------
-- 3. PLANTA BAIXA — site_plans + site_plan_placements
--    site_plans exige image_path NOT NULL. Usamos um caminho público válido
--    no Storage; o hook usa signed URL, então se a imagem não existir, exibe
--    placeholder. Para simplificar, criamos APENAS o registro.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='site_plans' AND table_schema='public') THEN
    CREATE TABLE public.site_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      image_path TEXT NOT NULL,
      image_width INTEGER NOT NULL DEFAULT 1920,
      image_height INTEGER NOT NULL DEFAULT 1080,
      is_default BOOLEAN DEFAULT false,
      user_id UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='site_plan_placements' AND table_schema='public') THEN
    CREATE TABLE public.site_plan_placements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id UUID NOT NULL REFERENCES public.site_plans(id) ON DELETE CASCADE,
      camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
      x NUMERIC NOT NULL DEFAULT 0,
      y NUMERIC NOT NULL DEFAULT 0,
      heading_deg NUMERIC DEFAULT 0,
      fov_deg NUMERIC DEFAULT 60,
      label TEXT,
      user_id UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END$$;

ALTER TABLE public.site_plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_plan_placements ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_plans' AND policyname='Anyone can view site_plans') THEN
    CREATE POLICY "Anyone can view site_plans" ON public.site_plans FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_plan_placements' AND policyname='Anyone can view placements') THEN
    CREATE POLICY "Anyone can view placements" ON public.site_plan_placements FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;

DELETE FROM public.site_plan_placements WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid;
DELETE FROM public.site_plans           WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid;

INSERT INTO public.site_plans (name, description, image_path, image_width, image_height, is_default, user_id)
VALUES
  ('Planta Térreo',  'Pavimento térreo — portaria, recepção e área externa', 'public/plans/ground-floor.png', 1920, 1080, true,  '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid),
  ('Planta 1º Andar','Primeiro andar — salas de reunião e operação',        'public/plans/first-floor.png',  1920, 1080, false, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid),
  ('Planta Galpão',  'Galpão logístico — docks e armazenagem',              'public/plans/warehouse.png',    1920, 1080, false, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid);

-- Placements: posiciona as 6 primeiras câmeras em coordenadas plausíveis no térreo
WITH plan1 AS (
  SELECT id FROM public.site_plans WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid AND is_default = true LIMIT 1
),
cams AS (
  SELECT id, name, row_number() OVER (ORDER BY name) AS rn FROM public.cameras
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
)
INSERT INTO public.site_plan_placements (plan_id, camera_id, x, y, heading_deg, fov_deg, label, user_id)
SELECT
  (SELECT id FROM plan1),
  c.id,
  -- distribui em 3 linhas x 2 colunas
  (CASE WHEN c.rn % 2 = 1 THEN 0.30 ELSE 0.70 END),
  (CASE WHEN c.rn <= 2 THEN 0.25 WHEN c.rn <= 4 THEN 0.50 ELSE 0.75 END),
  90.0,
  60.0,
  c.name,
  '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
FROM cams c WHERE c.rn <= 6;

-- ---------------------------------------------------------------------
-- 4. EVIDENCE EXPORTS — /registro-probatorio
--    O trigger BEFORE INSERT evidence_exports_seal() exige manifest com
--    version='1', rootHash (64 hex), requestedBy, exportId, assessment.level,
--    segments e chain (corrente recalculada). O trigger sobrescreve quase
--    todos os campos — só precisamos fornecer o manifest válido.
-- ---------------------------------------------------------------------
DELETE FROM public.evidence_exports WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid;

WITH cams AS (
  SELECT id, name, row_number() OVER (ORDER BY name) AS rn FROM public.cameras
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
   LIMIT 5
),
base AS (
  SELECT
    c.id,
    c.name,
    n AS n,
    ('EXP-' || to_char(now()::date - make_interval(days => n), 'YYYYMMDD') || '-' || lpad((c.rn * 10 + n)::text, 4, '0'))::text AS export_id,
    CASE n WHEN 0 THEN 'admissible' WHEN 1 THEN 'admissible' WHEN 2 THEN 'broken' WHEN 3 THEN 'admissible' ELSE 'weakened' END::text AS verdict,
    CASE n WHEN 2 THEN 0.85 WHEN 4 THEN 0.92 ELSE 0.98 END::numeric AS coverage,
    CASE n WHEN 2 THEN 2 ELSE 0 END AS gaps
  FROM cams c
  CROSS JOIN generate_series(0, 4) AS n
),
segments_built AS (
  SELECT
    b.*,
    -- Schema estrito exigido por evidence_canonical_segment()
    jsonb_build_array(
      jsonb_build_object(
        'index', 1,
        'byteSize', 1048576,
        'clockOffsetMs', 0,
        'deviceStartUtc', to_char(now() - make_interval(days => n + 1), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'deviceEndUtc',   to_char(now() - make_interval(days => n + 1, hours => -8), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'receivedAtUtc',  to_char(now() - make_interval(days => n + 1), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'storagePath', 'cameras/' || b.id::text || '/seg-001.ts',
        'sha256', encode(digest(b.export_id || ':seg1', 'sha256'), 'hex')
      )
    ) AS segs
  FROM base b
),
manifests AS (
  SELECT
    sb.*,
    public.evidence_chain(sb.segs) AS chain_arr,
    -- rootHash = último elo da corrente
    (
      SELECT x
        FROM unnest(public.evidence_chain(sb.segs)) WITH ORDINALITY AS t(x, ord)
       ORDER BY ord DESC
       LIMIT 1
    ) AS root_hash
  FROM segments_built sb
)
INSERT INTO public.evidence_exports (camera_id, manifest, sealed_at, user_id)
SELECT
  id,
  jsonb_build_object(
    'version', '1',
    'exportId', export_id,
    'rootHash', root_hash,
    'requestedBy', '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::text,
    'segments', segs,
    'chain', to_jsonb(chain_arr),
    'assessment', jsonb_build_object(
      'level', verdict,
      'coverageRatio', coverage,
      'gaps', CASE WHEN gaps > 0 THEN jsonb_build_array(jsonb_build_object('kind','gap','count',gaps)) ELSE '[]'::jsonb END
    )
  ),
  now() - make_interval(days => n),
  '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
FROM manifests;

-- ---------------------------------------------------------------------
-- 5. USER ROLES — /usuarios
--    Vincula um role ao seu user; o hook admin-users lê via edge function.
--    Aqui só garantimos que existe um role.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='app_role' AND typnamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')) THEN
    CREATE TYPE public.app_role AS ENUM ('admin','manager','operator','viewer');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_roles' AND table_schema='public') THEN
    CREATE TABLE public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role public.app_role NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, role)
    );
  END IF;
END$$;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_roles' AND policyname='Users can view own roles') THEN
    CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
  END IF;
END$$;

INSERT INTO public.user_roles (user_id, role)
VALUES ('320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- ---------------------------------------------------------------------
-- 6. Verificação final
-- ---------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM public.zones WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid)               AS zones,
  (SELECT count(*) FROM public.zone_events WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid)         AS zone_events,
  (SELECT count(*) FROM public.collab_networks WHERE owner_org_id IN (
     SELECT organization_id FROM public.organization_members
      WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid))                                            AS collab_networks,
  (SELECT count(*) FROM public.collab_invitations WHERE invited_by = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid) AS collab_invitations,
  (SELECT count(*) FROM public.site_plans WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid)           AS site_plans,
  (SELECT count(*) FROM public.site_plan_placements WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid) AS site_plan_placements,
  (SELECT count(*) FROM public.evidence_exports WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid)     AS evidence_exports,
  (SELECT count(*) FROM public.user_roles WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid)           AS user_roles;
