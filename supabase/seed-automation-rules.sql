-- ============================================================================
-- SEED: Regras de Automação
-- Cole e rode no SQL Editor do Dashboard:
--   https://supabase.com/dashboard/project/pmzxbffnbenkmzpnbehb/sql/new
-- ============================================================================

-- 1. Estende o enum para os condition_types que faltam
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'perimeter_breach';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'object_left';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'absence_detection';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'agglomeration_detection';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'anomaly_position';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'anomaly_speed';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'anomaly_displacement';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'scene_change';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'recurrent_vehicle';

-- 2. Descobre o user_id do admin ti@promobrindes.com.br (pega o user_roles)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- tenta ti@promobrindes.com.br primeiro
  SELECT ur.user_id INTO v_user_id
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  WHERE u.email = 'ti@promobrindes.com.br'
  LIMIT 1;

  -- fallback: qualquer admin
  IF v_user_id IS NULL THEN
    SELECT user_id INTO v_user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  END IF;

  -- fallback: primeiro user com qualquer role
  IF v_user_id IS NULL THEN
    SELECT user_id INTO v_user_id FROM public.user_roles LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum user_id em user_roles — crie antes';
  END IF;

  RAISE NOTICE 'Usando user_id: %', v_user_id;

  INSERT INTO public.rules (name, description, category, severity, conditions, actions, cameras, is_active, user_id)
  SELECT * FROM (VALUES
    ('Detecção de Intrusos', 'Alerta quando movimento é detectado em áreas restritas fora do horário comercial',
      'security'::public.rule_category, 'critical'::public.rule_severity,
      '[{"type":"motion_detection","operator":"equals","value":1},{"type":"restricted_area","operator":"equals","value":1}]'::jsonb,
      ARRAY['alert','notify','record']::public.rule_action[], '{}'::text[], true, v_user_id),

    ('Violação de Perímetro', 'Detecta quando alguém cruza o perímetro de segurança definido',
      'security'::public.rule_category, 'critical'::public.rule_severity,
      '[{"type":"perimeter_breach","operator":"equals","value":1}]'::jsonb,
      ARRAY['alert','notify','record','lockdown']::public.rule_action[], '{}'::text[], true, v_user_id),

    ('Permanência Suspeita', 'Alerta quando pessoa permanece em área por tempo prolongado',
      'security'::public.rule_category, 'high'::public.rule_severity,
      '[{"type":"loitering","operator":"greater_than","value":300}]'::jsonb,
      ARRAY['alert','notify']::public.rule_action[], '{}'::text[], true, v_user_id),

    ('Monitoramento de EPIs', 'Alerta quando trabalhadores não estão usando equipamentos de proteção',
      'safety'::public.rule_category, 'high'::public.rule_severity,
      '[{"type":"no_ppe","operator":"equals","value":1}]'::jsonb,
      ARRAY['alert','notify']::public.rule_action[], '{}'::text[], true, v_user_id),

    ('Aglomeração Perigosa', 'Detecta quando há muitas pessoas em área com limite de capacidade',
      'safety'::public.rule_category, 'high'::public.rule_severity,
      '[{"type":"crowd_density","operator":"greater_than","value":80}]'::jsonb,
      ARRAY['alert','notify']::public.rule_action[], '{}'::text[], true, v_user_id),

    ('Acesso Não Autorizado', 'Alerta quando pessoa não reconhecida tenta acessar área restrita',
      'access'::public.rule_category, 'critical'::public.rule_severity,
      '[{"type":"face_recognition","operator":"equals","value":0},{"type":"restricted_area","operator":"equals","value":1}]'::jsonb,
      ARRAY['alert','notify','record','lockdown']::public.rule_action[], '{}'::text[], true, v_user_id),

    ('Limite de Capacidade', 'Alerta quando área atinge capacidade máxima definida',
      'operations'::public.rule_category, 'medium'::public.rule_severity,
      '[{"type":"people_count","operator":"greater_than","value":50}]'::jsonb,
      ARRAY['alert','notify']::public.rule_action[], '{}'::text[], true, v_user_id),

    ('Mudança de Cena', 'Detecta quando a câmera foi movida, obstruída ou adulterada',
      'security'::public.rule_category, 'critical'::public.rule_severity,
      '[{"type":"scene_change","operator":"equals","value":1}]'::jsonb,
      ARRAY['alert','notify','record']::public.rule_action[], '{}'::text[], true, v_user_id)
  ) AS v(name, description, category, severity, conditions, actions, cameras, is_active, user_id)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.rules r WHERE r.name = v.name
  );
END $$;

-- 3. Confirma
SELECT name, category, severity, is_active FROM public.rules ORDER BY name;
