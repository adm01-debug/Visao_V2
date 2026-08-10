-- Seed: regras de automação iniciais + extensão do enum condition_type
--
-- Contexto: tela /automation-rules estava vazia. Os templates de regras
-- em src/data/ruleTemplates.ts referenciam condition_type além do que o
-- enum original suporta — necessário estender antes do INSERT.
--
-- Idempotente: usa ON CONFLICT (name) DO NOTHING. Re-rodar não duplica.
-- user_id: pega o primeiro admin/user do sistema. Se não houver, deixa null.

-- 1. Estende enum para cobrir todos os condition_type dos templates
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'perimeter_breach';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'object_left';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'absence_detection';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'agglomeration_detection';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'anomaly_position';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'anomaly_speed';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'anomaly_displacement';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'scene_change';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'recurrent_vehicle';

-- 2. Garante que existe pelo menos um user_id para satisfazer NOT NULL/user_id
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Seed de 8 regras cobrindo todas as categorias principais
    -- Casts explícitos nos enums: VALUES infere text por padrão, é preciso ::rule_category etc.
    INSERT INTO public.rules (name, description, category, severity, conditions, actions, cameras, is_active, user_id)
    SELECT * FROM (VALUES
      ('Detecção de Intrusos', 'Alerta quando movimento é detectado em áreas restritas fora do horário comercial',
        'security'::public.rule_category, 'critical'::public.rule_severity,
        '[{"type":"motion_detection","operator":"equals","value":1},{"type":"restricted_area","operator":"equals","value":1}]'::jsonb,
        ARRAY['alert','notify','record']::public.rule_action[], '{}', true, v_user_id),

      ('Violação de Perímetro', 'Detecta quando alguém cruza o perímetro de segurança definido',
        'security'::public.rule_category, 'critical'::public.rule_severity,
        '[{"type":"perimeter_breach","operator":"equals","value":1}]'::jsonb,
        ARRAY['alert','notify','record','lockdown']::public.rule_action[], '{}', true, v_user_id),

      ('Permanência Suspeita', 'Alerta quando pessoa permanece em área por tempo prolongado',
        'security'::public.rule_category, 'high'::public.rule_severity,
        '[{"type":"loitering","operator":"greater_than","value":300}]'::jsonb,
        ARRAY['alert','notify']::public.rule_action[], '{}', true, v_user_id),

      ('Monitoramento de EPIs', 'Alerta quando trabalhadores não estão usando equipamentos de proteção',
        'safety'::public.rule_category, 'high'::public.rule_severity,
        '[{"type":"no_ppe","operator":"equals","value":1}]'::jsonb,
        ARRAY['alert','notify']::public.rule_action[], '{}', true, v_user_id),

      ('Aglomeração Perigosa', 'Detecta quando há muitas pessoas em área com limite de capacidade',
        'safety'::public.rule_category, 'high'::public.rule_severity,
        '[{"type":"crowd_density","operator":"greater_than","value":80}]'::jsonb,
        ARRAY['alert','notify']::public.rule_action[], '{}', true, v_user_id),

      ('Acesso Não Autorizado', 'Alerta quando pessoa não reconhecida tenta acessar área restrita',
        'access'::public.rule_category, 'critical'::public.rule_severity,
        '[{"type":"face_recognition","operator":"equals","value":0},{"type":"restricted_area","operator":"equals","value":1}]'::jsonb,
        ARRAY['alert','notify','record','lockdown']::public.rule_action[], '{}', true, v_user_id),

      ('Limite de Capacidade', 'Alerta quando área atinge capacidade máxima definida',
        'operations'::public.rule_category, 'medium'::public.rule_severity,
        '[{"type":"people_count","operator":"greater_than","value":50}]'::jsonb,
        ARRAY['alert','notify']::public.rule_action[], '{}', true, v_user_id),

      ('Mudança de Cena', 'Detecta quando a câmera foi movida, obstruída ou adulterada',
        'security'::public.rule_category, 'critical'::public.rule_severity,
        '[{"type":"scene_change","operator":"equals","value":1}]'::jsonb,
        ARRAY['alert','notify','record']::public.rule_action[], '{}', true, v_user_id)
    ) AS v(name, description, category, severity, conditions, actions, cameras, is_active, user_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.rules r WHERE r.name = v.name
    );
  END IF;
END $$;
