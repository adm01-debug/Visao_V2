-- =====================================================================
-- VISÃO v2 — Seed para /behavior-detection (Comportamento)
-- Projeto: pmzxbffnbenkmzpnbehb
-- User ID: 320f72f4-debc-4092-a4cf-bd4b42dbf3e5
--
-- A edge function detect-behavior depende de LOVABLE_API_KEY + deploy.
-- Sem deploy, /behavior-detection fica vazia. Esta migration cria uma
-- tabela de histórico que o hook passa a ler como fallback.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabela behavior_analyses (histórico persistido)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.behavior_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID REFERENCES public.cameras(id) ON DELETE SET NULL,
  camera_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  people_count INTEGER NOT NULL DEFAULT 0,
  productivity_score INTEGER NOT NULL DEFAULT 0,
  behavioral_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  zone_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_behavior_analyses_user
  ON public.behavior_analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_analyses_camera
  ON public.behavior_analyses(camera_id);

ALTER TABLE public.behavior_analyses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='behavior_analyses' AND policyname='Users can view own behavior_analyses') THEN
    CREATE POLICY "Users can view own behavior_analyses"   ON public.behavior_analyses FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='behavior_analyses' AND policyname='Users can insert own behavior_analyses') THEN
    CREATE POLICY "Users can insert own behavior_analyses" ON public.behavior_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='behavior_analyses' AND policyname='Users can delete own behavior_analyses') THEN
    CREATE POLICY "Users can delete own behavior_analyses" ON public.behavior_analyses FOR DELETE USING (auth.uid() = user_id);
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- 2. Seed — 10 análises determinísticas distribuídas pelas suas câmeras
-- ---------------------------------------------------------------------
DELETE FROM public.behavior_analyses WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid;

WITH cams AS (
  SELECT id, name FROM public.cameras
   WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid
   ORDER BY name
   LIMIT 10
),
seed_data AS (
  SELECT
    c.id   AS camera_id,
    c.name AS camera_name,
    s.*
  FROM cams c
  CROSS JOIN LATERAL (
    VALUES
      -- 1
      (12, 78,
       jsonb_build_array(
         jsonb_build_object('pattern_type','excessive_conversation','confidence',0.82,'severity','medium','people_involved',3,'estimated_duration_minutes',7,'location','Centro da sala','description','Grupo de 3 colaboradores conversando longe das estações.','recommendation','Reforçar política de retorno aos postos.'),
         jsonb_build_object('pattern_type','cell_phone_usage','confidence',0.91,'severity','high','people_involved',1,'estimated_duration_minutes',4,'location','Estação 4','description','Colaborador utilizando celular durante expediente.','recommendation','Alertar supervisor imediato.')
       ),
       jsonb_build_object('productive_zones_occupied',5,'idle_zones_occupied',2,'empty_workstations',1),
       jsonb_build_array(
         jsonb_build_object('type','phone','severity','high','message','Uso de celular detectado','action_required',true),
         jsonb_build_object('type','conversation','severity','medium','message','Conversa prolongada','action_required',false)
       ),
       'Sala com boa ocupação. Detectados uso de celular e conversa prolongada.',
       jsonb_build_array('Reforçar política de celular','Estimular pausas curtas programadas')
      ),
      -- 2
      (8, 85,
       jsonb_build_array(
         jsonb_build_object('pattern_type','prolonged_absence','confidence',0.74,'severity','medium','people_involved',1,'estimated_duration_minutes',22,'location','Estação 7','description','Estação vazia há mais de 20 min fora do horário de almoço.','recommendation','Verificar com gestor responsável.')
       ),
       jsonb_build_object('productive_zones_occupied',6,'idle_zones_occupied',1,'empty_workstations',1),
       jsonb_build_array(
         jsonb_build_object('type','absence','severity','medium','message','Ausência prolongada','action_required',true)
       ),
       'Galpão com operação normal. Uma estação permanece vazia.',
       jsonb_build_array('Confirmar se ausência é justificada')
      ),
      -- 3
      (15, 62,
       jsonb_build_array(
         jsonb_build_object('pattern_type','excessive_conversation','confidence',0.88,'severity','high','people_involved',5,'estimated_duration_minutes',12,'location','Centro do refeitório','description','Aglomeração no refeitório fora do horário.','recommendation','Dispersar grupo.'),
         jsonb_build_object('pattern_type','crowding','confidence',0.79,'severity','medium','people_involved',5,'estimated_duration_minutes',10,'location','Corredor B','description','Corredor bloqueado por conversa em grupo.','recommendation','Sinalizar rota alternativa.')
       ),
       jsonb_build_object('productive_zones_occupied',4,'idle_zones_occupied',3,'empty_workstations',2),
       jsonb_build_array(
         jsonb_build_object('type','crowding','severity','high','message','Aglomeração detectada','action_required',true)
       ),
       'Área de refeitório com aglomeração fora de horário. Produtividade abaixo do esperado.',
       jsonb_build_array('Reforçar sinalização','Comunicação via canal oficial')
      ),
      -- 4
      (6, 92,
       '[]'::jsonb,
       jsonb_build_object('productive_zones_occupied',5,'idle_zones_occupied',1,'empty_workstations',0),
       '[]'::jsonb,
       'Sala de controle operando normalmente. Sem padrões detectados.',
       jsonb_build_array('Manter monitoramento padrão')
      ),
      -- 5
      (10, 71,
       jsonb_build_array(
         jsonb_build_object('pattern_type','distraction','confidence',0.68,'severity','low','people_involved',2,'estimated_duration_minutes',3,'location','Estações 2-3','description','Colaboradores olhando para o lado com frequência.','recommendation','Observar se persiste.')
       ),
       jsonb_build_object('productive_zones_occupied',7,'idle_zones_occupied',1,'empty_workstations',0),
       jsonb_build_array(
         jsonb_build_object('type','behavior','severity','low','message','Possível distração','action_required',false)
       ),
       'Linha de produção operando dentro da normalidade. Leve distração detectada.',
       jsonb_build_array('Monitorar reincidência')
      ),
      -- 6
      (18, 55,
       jsonb_build_array(
         jsonb_build_object('pattern_type','drowsiness','confidence',0.72,'severity','high','people_involved',1,'estimated_duration_minutes',6,'location','Estação 11','description','Colaborador com sinais de sonolência (cabeça baixa, imobilidade).','recommendation','Acionar supervisor de turno para verificação.'),
         jsonb_build_object('pattern_type','cell_phone_usage','confidence',0.85,'severity','medium','people_involved',2,'estimated_duration_minutes',5,'location','Estações 9-10','description','Uso simultâneo de celular em duas estações.','recommendation','Reforçar treinamento.')
       ),
       jsonb_build_object('productive_zones_occupied',8,'idle_zones_occupied',4,'empty_workstations',2),
       jsonb_build_array(
         jsonb_build_object('type','behavior','severity','high','message','Sinais de sonolência','action_required',true),
         jsonb_build_object('type','phone','severity','medium','message','Uso de celular','action_required',false)
       ),
       'Sinal crítico: colaborador com sonolência. Risco operacional elevado.',
       jsonb_build_array('Acionar supervisor','Avaliar troca de turno','Reforçar briefing de segurança')
      ),
      -- 7
      (9, 81,
       jsonb_build_array(
         jsonb_build_object('pattern_type','unauthorized_break','confidence',0.65,'severity','medium','people_involved',1,'estimated_duration_minutes',9,'location','Estação externa','description','Colaborador em pausa fora da janela autorizada.','recommendation','Registrar ocorrência.')
       ),
       jsonb_build_object('productive_zones_occupied',6,'idle_zones_occupied',2,'empty_workstations',1),
       jsonb_build_array(
         jsonb_build_object('type','behavior','severity','medium','message','Pausa não autorizada','action_required',false)
       ),
       'Operação regular. Detectada pausa fora do horário permitido.',
       jsonb_build_array('Comunicar RH para registro')
      ),
      -- 8
      (14, 76,
       jsonb_build_array(
         jsonb_build_object('pattern_type','cell_phone_usage','confidence',0.93,'severity','critical','people_involved',1,'estimated_duration_minutes',11,'location','Portaria','description','Atendente da portaria utilizando celular.','recommendation','Acionar gestor imediatamente.')
       ),
       jsonb_build_object('productive_zones_occupied',10,'idle_zones_occupied',2,'empty_workstations',1),
       jsonb_build_array(
         jsonb_build_object('type','phone','severity','critical','message','Uso prolongado de celular na portaria','action_required',true)
       ),
       'Portaria apresenta uso prolongado de celular. Risco de segurança.',
       jsonb_build_array('Troca imediata do atendente','Revisar protocolo de portaria')
      ),
      -- 9
      (11, 88,
       jsonb_build_array(
         jsonb_build_object('pattern_type','prolonged_absence','confidence',0.58,'severity','low','people_involved',1,'estimated_duration_minutes',14,'location','Estação 6','description','Estação vazia por período curto.','recommendation','Sem ação necessária se justificada.')
       ),
       jsonb_build_object('productive_zones_occupied',9,'idle_zones_occupied',1,'empty_workstations',1),
       '[]'::jsonb,
       'Boa ocupação geral. Apenas uma ausência curta detectada.',
       jsonb_build_array('Sem ação adicional')
      ),
      -- 10
      (16, 67,
       jsonb_build_array(
         jsonb_build_object('pattern_type','excessive_conversation','confidence',0.77,'severity','medium','people_involved',4,'estimated_duration_minutes',8,'location','Sala de reunião','description','Reunião estendida além do tempo programado.','recommendation','Avaliar se ainda é produtiva.'),
         jsonb_build_object('pattern_type','cell_phone_usage','confidence',0.71,'severity','low','people_involved',1,'estimated_duration_minutes',2,'location','Sala de reunião','description','Participante utilizando celular durante a reunião.','recommendation','Sinalizar em ata.')
       ),
       jsonb_build_object('productive_zones_occupied',7,'idle_zones_occupied',3,'empty_workstations',1),
       jsonb_build_array(
         jsonb_build_object('type','conversation','severity','medium','message','Reunião prolongada','action_required',false)
       ),
       'Sala de reunião com duração estendida. Produtividade abaixo do ideal.',
       jsonb_build_array('Reforçar time-boxing','Estimular uso de celular em pausas')
      )
  ) AS s(people_count, productivity_score, behavioral_patterns, zone_analysis, alerts, summary, recommendations)
)
INSERT INTO public.behavior_analyses (
  camera_id, camera_name, user_id,
  people_count, productivity_score,
  behavioral_patterns, zone_analysis, alerts,
  summary, recommendations, image_url,
  created_at
)
SELECT
  camera_id, camera_name, '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid,
  people_count, productivity_score,
  behavioral_patterns, zone_analysis, alerts,
  summary, recommendations,
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
  now() - (row_number() OVER (ORDER BY camera_name) || ' hours')::interval
FROM seed_data;

-- ---------------------------------------------------------------------
-- 3. Verificação
-- ---------------------------------------------------------------------
SELECT
  count(*)                                                              AS total_analyses,
  count(DISTINCT camera_id)                                             AS distinct_cameras,
  round(avg(productivity_score))                                        AS avg_productivity,
  sum(jsonb_array_length(behavioral_patterns))                          AS total_patterns
FROM public.behavior_analyses
WHERE user_id = '320f72f4-debc-4092-a4cf-bd4b42dbf3e5'::uuid;
