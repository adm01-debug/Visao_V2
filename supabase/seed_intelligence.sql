-- =====================================================================
-- VISÃO v2 — Seed módulo Inteligência (10 sub-páginas)
-- Projeto: pmzxbffnbenkmzpnbehb
-- User ID: 320f72f4-debc-4092-a4cf-bd4b42dbf3e5
--
-- Páginas populadas:
--   1. /analytics               — alerts + analysis_history
--   2. /analytics/recognition   — recognition_logs
--   3. /behavior                — só precisa de cameras (já populadas)
--   4. /face-recognition        — live; depende de recognition_logs
--   5. /face-search             — recognition_logs
--   6. /recognition-logs        — recognition_logs + registered_persons
--   7. /license-plates          — registered_plates + plate_detections
--   8. /vehicles                — registered_plates
--   9. /heatmap                 — só roda em memória; sem seed
--  10. /weekly-report           — event_alerts + panic_events + recognition_logs
--
-- Idempotente: limpa registros do seu user antes de inserir.
-- NÃO apaga cameras nem registered_persons pré-existentes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Garante que você pertence a pelo menos uma organização
--    (necessária para event_alerts por causa de RLS)
--    Se já for membro, sai sem fazer nada. Se não, cria + vincula.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  -- 1. Procura org existente da qual você já é membro
  SELECT organization_id INTO v_org_id
    FROM public.organization_members
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
   LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    RETURN;  -- já é membro, nada a fazer
  END IF;

  -- 2. Verifica de novo (race condition guard) e sai se já existir
  PERFORM 1 FROM public.organization_members
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid;
  IF FOUND THEN
    RETURN;
  END IF;

  -- 3. Cria org + vincula como owner
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES ('VISÃO Demo', 'visao-demo', '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid)
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, 'owner')
  ON CONFLICT (organization_id, user_id) DO NOTHING;
END$$;

-- ---------------------------------------------------------------------
-- 1. registered_persons (12 pessoas — alimenta reconhecimento facial)
--    Só insere se ainda não houver para este user
-- ---------------------------------------------------------------------
INSERT INTO public.registered_persons (user_id, name, role, department, is_active)
SELECT '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, n.name, n.role, n.dept, true
FROM (VALUES
  ('Carlos Mendes',     'Operador',     'Almoxarifado'),
  ('Ana Souza',         'Supervisora',  'Logística'),
  ('João Pereira',      'Motorista',    'Transporte'),
  ('Maria Silva',       'Cozinheira',   'Refeitório'),
  ('Pedro Costa',       'Pedreiro',     'Obras'),
  ('Lucia Ferreira',    'Técnica',      'Manutenção'),
  ('Roberto Lima',      'Segurança',    'Portaria'),
  ('Fernanda Rocha',    'Engenheira',   'Engenharia'),
  ('Marcos Oliveira',   'Eletricista',  'Manutenção'),
  ('Patricia Santos',   'Administradora','Administrativo'),
  ('Ricardo Almeida',   'Mecânico',     'Oficina'),
  ('Juliana Castro',    'Coordenadora', 'RH')
) AS n(name, role, dept)
WHERE NOT EXISTS (
  SELECT 1 FROM public.registered_persons p
   WHERE p.name = n.name AND p.user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
)
RETURNING id;

-- ---------------------------------------------------------------------
-- 2. registered_plates (15 placas — alimenta /license-plates e /vehicles)
-- ---------------------------------------------------------------------
INSERT INTO public.registered_plates (user_id, plate, owner_name, vehicle_type, color, list_type, notes, is_active)
SELECT '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid, p.plate, p.owner, p.vtype, p.color, p.list_type, p.notes, true
FROM (VALUES
  ('ABC1D23', 'Carlos Mendes',   'car',   'Prata',    'whitelist',  'Colaborador'),
  ('XYZ4E56', 'Ana Souza',       'car',   'Preto',    'whitelist',  'Supervisora'),
  ('FOR7G89', 'Fornecedor Norte','truck', 'Branco',   'whitelist',  'Repositório'),
  ('HID0H00', 'Convidado VIP',   'car',   'Vermelho', 'whitelist',  'Liberado 24h'),
  ('BLA1A11', 'José Antunes',    'car',   'Preto',    'blacklist',  'Tentou invadir pátio'),
  ('SUS2B22', 'Desconhecido',    'motorcycle', 'Vermelho', 'blacklist', 'Suspeito'),
  ('CAR3C33', 'Entregas Express','van',   'Branco',   'whitelist',  'Carga diária'),
  ('TRC4D44', 'Logística Total', 'truck', 'Azul',     'whitelist',  'Transporte'),
  ('VFR5E55', 'Maria Silva',     'car',   'Cinza',    'whitelist',  'Funcionária'),
  ('GTR6F66', 'Pedro Costa',     'car',   'Preto',    'whitelist',  'Funcionário'),
  ('PLQ7G77', 'Não identificado','car',   'Branco',   'blacklist',  'Reportado pelo RH'),
  ('MIN8H88', 'Mineração S/A',  'truck', 'Amarelo',  'whitelist',  'Fornecedor'),
  ('VEM9I99', 'Visitante',       'car',   'Azul',     'whitelist',  'Autorizado'),
  ('ROB0J00', 'Roberto Lima',    'car',   'Prata',    'whitelist',  'Segurança'),
  ('FER1K11', 'Fornecedor Sul',  'van',   'Branco',   'whitelist',  'Entrega semanal')
) AS p(plate, owner, vtype, color, list_type, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.registered_plates r
   WHERE r.plate = p.plate AND r.user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
);

-- ---------------------------------------------------------------------
-- 3. recognition_logs (250 registros, últimos 30 dias)
--    Distribuídos: ~80% recognized=true, ~20% false
--    Mistura cameras e persons
-- ---------------------------------------------------------------------
WITH cams AS (
  SELECT id, name FROM public.cameras
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
   LIMIT 19
),
persons AS (
  SELECT id, name FROM public.registered_persons
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
)
INSERT INTO public.recognition_logs (camera_id, person_id, user_id, confidence, recognized, timestamp, created_at)
SELECT
  (SELECT id FROM cams ORDER BY random() LIMIT 1),
  (CASE WHEN random() < 0.8 THEN (SELECT id FROM persons ORDER BY random() LIMIT 1) ELSE NULL END),
  '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid,
  (0.55 + random() * 0.44)::numeric(4,3),
  (random() < 0.8),
  now() - (random() * interval '30 days'),
  now() - (random() * interval '30 days')
FROM generate_series(1, 250);

-- ---------------------------------------------------------------------
-- 4. plate_detections (100 detecções, últimos 30 dias)
--    Particionada — created_at precisa cair na partição m2026_08 ou > m2026_07
-- ---------------------------------------------------------------------
WITH cams AS (
  SELECT id, name FROM public.cameras
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
   LIMIT 19
),
plates AS (
  SELECT plate FROM public.registered_plates
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
)
INSERT INTO public.plate_detections (user_id, plate, camera_id, camera_name, confidence, vehicle_type, status, direction, timestamp, created_at)
SELECT
  '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid,
  (SELECT plate FROM plates ORDER BY random() LIMIT 1),
  (SELECT id FROM cams ORDER BY random() LIMIT 1),
  (SELECT name FROM cams ORDER BY random() LIMIT 1),
  (0.80 + random() * 0.19)::numeric(4,3),
  (ARRAY['car','truck','motorcycle','van'])[ceil(random()*4)],
  (ARRAY['whitelist','unknown','blacklist','unknown'])[ceil(random()*4)],
  (ARRAY['entry','exit'])[ceil(random()*2)],
  now() - (random() * interval '30 days'),
  now() - (random() * interval '30 days')
FROM generate_series(1, 100);

-- ---------------------------------------------------------------------
-- 5. analysis_history (40 análises, últimos 30 dias)
-- ---------------------------------------------------------------------
WITH cams AS (
  SELECT id FROM public.cameras
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
   LIMIT 19
)
INSERT INTO public.analysis_history (camera_id, user_id, timestamp, analysis_type, result, confidence, created_at)
SELECT
  (SELECT id FROM cams ORDER BY random() LIMIT 1),
  '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid,
  now() - (random() * interval '30 days'),
  (ARRAY['object_detection','face_detection','behavior_analysis','vehicle_detection','crowd_density'])[ceil(random()*5)],
  jsonb_build_object(
    'detections', (random() * 20)::int,
    'objects', (ARRAY['person','vehicle','package'])[ceil(random()*3)]
  ),
  (0.70 + random() * 0.29)::numeric(4,3),
  now() - (random() * interval '30 days')
FROM generate_series(1, 40);

-- ---------------------------------------------------------------------
-- 6. event_alerts (50 alertas, últimos 30 dias)
--    Vínculo via organizations + organization_members
-- ---------------------------------------------------------------------
WITH org AS (
  SELECT o.id FROM public.organizations o
   JOIN public.organization_members m ON m.organization_id = o.id
   WHERE m.user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
   LIMIT 1
),
cams AS (
  SELECT id FROM public.cameras
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
   LIMIT 19
)
INSERT INTO public.event_alerts (organization_id, camera_id, title, description, severity, status, triggered_at, dedup_key, created_at)
SELECT
  (SELECT id FROM org),
  (SELECT id FROM cams ORDER BY random() LIMIT 1),
  t.title,
  t.description,
  t.severity::public.event_alert_severity,
  t.status::public.event_alert_status,
  now() - (random() * interval '30 days'),
  'seed-' || gen_random_uuid()::text,
  now() - (random() * interval '30 days')
FROM (VALUES
  ('Pessoa em área restrita',           'Detectada presença em zona proibida',          'high',     'open'),
  ('Veículo estacionado prolongadamente','Carro parado há mais de 30 minutos',            'medium',   'acknowledged'),
  ('Aglomeração detectada',             'Mais de 10 pessoas no mesmo local',             'medium',   'open'),
  ('Pessoa caída (possível emergência)', 'Detecção de pessoa imóvel no chão',             'critical', 'open'),
  ('Cerca virtual violada',             'Movimento cruzado na cerca do perímetro',      'critical', 'resolved'),
  ('Acesso não autorizado',             'Tentativa de acesso com cartão inválido',       'high',     'open'),
  ('Pacote abandonado',                 'Objeto estático há mais de 15 minutos',         'low',      'open'),
  ('Movimento fora do horário',         'Detecção de movimento entre 02h-04h',            'high',     'acknowledged'),
  ('Veículo em velocidade',             'Carro acima do limite de 20 km/h',              'medium',   'open'),
  ('Fumaça detectada',                  'Possível início de incêndio',                    'critical', 'open'),
  ('Pessoa correndo',                   'Comportamento suspeito',                        'medium',   'open'),
  ('Reconhecimento: pessoa na blacklist','Identificado na lista restrita',                'high',     'open'),
  ('Queda de energia na câmera',        'Câmera offline há 10 minutos',                  'low',      'resolved'),
  ('Tentativa de tampering',            'Câmera obstruída',                              'high',     'open'),
  ('Veículo não identificado',          'Placa não consta no cadastro',                 'medium',   'open')
) AS t(title, description, severity, status)
CROSS JOIN generate_series(1, 4) gs;

-- ---------------------------------------------------------------------
-- 7. panic_events (6 eventos, últimos 14 dias)
-- ---------------------------------------------------------------------
INSERT INTO public.panic_events (user_id, user_name, user_email, user_phone, latitude, longitude, location_address, resolved, resolved_at, notes, created_at)
SELECT
  '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid,
  u.name,
  u.email,
  u.phone,
  -23.5505 + (random() - 0.5) * 0.05,
  -46.6333 + (random() - 0.5) * 0.05,
  u.address,
  u.resolved,
  CASE WHEN u.resolved THEN now() - (random() * interval '7 days') ELSE NULL END,
  u.notes,
  now() - (random() * interval '14 days')
FROM (VALUES
  ('Carlos Mendes',   'carlos@visao.local',   '+5511988880001', 'Galpão B - Setor de estoque',       true,  'Atendido pelo supervisor'),
  ('Ana Souza',       'ana@visao.local',      '+5511988880002', 'Pátio externo - Doca 03',           true,  'Falso alarme'),
  ('João Pereira',    'joao@visao.local',     '+5511988880003', 'Refeitório - Cozinha',              false, NULL),
  ('Maria Silva',     'maria@visao.local',    '+5511988880004', 'Bloco A - Portaria',               true,  'Resolvido em 5 min'),
  ('Pedro Costa',     'pedro@visao.local',    '+5511988880005', 'Oficina mecânica',                 false, NULL),
  ('Lucia Ferreira',  'lucia@visao.local',    '+5511988880006', 'Sala de manutenção',               true,  'Equipamento OK')
) AS u(name, email, phone, address, resolved, notes);

-- ---------------------------------------------------------------------
-- 8. alerts (legado — para /analytics se ela ainda usa)
--    Verifico primeiro se a tabela existe
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='alerts' AND table_schema='public') THEN
    EXECUTE $E$
      INSERT INTO public.alerts (user_id, camera_id, camera_name, type, severity, message, created_at)
      SELECT
        '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid,
        (SELECT id FROM public.cameras WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid ORDER BY random() LIMIT 1),
        (SELECT name FROM public.cameras WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid ORDER BY random() LIMIT 1),
        ((ARRAY['security','safety','operations','access','analytics']::public.alert_type[]))[ceil(random()*5)],
        ((ARRAY['low','medium','high','critical']::public.rule_severity[]))[ceil(random()*4)],
        'Alerta de exemplo para popular dashboard',
        now() - (random() * interval '30 days')
      FROM generate_series(1, 60)
    $E$;
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 9. Verificação final
-- ---------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM public.registered_persons WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid) AS persons,
  (SELECT count(*) FROM public.registered_plates  WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid) AS plates,
  (SELECT count(*) FROM public.recognition_logs  WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid) AS recognition_logs,
  (SELECT count(*) FROM public.plate_detections  WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid) AS plate_detections,
  (SELECT count(*) FROM public.analysis_history  WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid) AS analysis_history,
  (SELECT count(*) FROM public.event_alerts      WHERE created_at > now() - interval '30 days')          AS event_alerts_30d,
  (SELECT count(*) FROM public.panic_events      WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid) AS panic_events;