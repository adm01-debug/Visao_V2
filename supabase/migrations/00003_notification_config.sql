-- ============================================
-- VISÃO - Sistema de Vigilância Inteligente
-- Configuração de Notificações de Alertas
-- ============================================

-- ============================================
-- 1. TABELA: Configuração de Notificações
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Nome da configuração
  name TEXT NOT NULL,
  description TEXT,
  
  -- Habilitado
  enabled BOOLEAN DEFAULT true,
  
  -- Canais de notificação
  channels TEXT[] DEFAULT '{"email"}',
  -- Opções: 'email', 'whatsapp', 'webhook', 'push'
  
  -- Filtros de alerta
  severity_filter TEXT[] DEFAULT '{"high", "critical"}',
  type_filter TEXT[] DEFAULT '{}', -- vazio = todos
  camera_filter UUID[] DEFAULT '{}', -- vazio = todas
  
  -- Destinatários
  email_recipients TEXT[] DEFAULT '{}',
  phone_recipients TEXT[] DEFAULT '{}',
  webhook_urls TEXT[] DEFAULT '{}',
  
  -- Horário de notificação
  schedule_enabled BOOLEAN DEFAULT false,
  schedule_start_time TIME DEFAULT '08:00',
  schedule_end_time TIME DEFAULT '22:00',
  schedule_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- Seg-Sex
  
  -- Cooldown (evitar spam)
  cooldown_minutes INTEGER DEFAULT 5,
  last_notification_at TIMESTAMPTZ,
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_notification_configs_enabled ON public.notification_configs(enabled) WHERE enabled = true;

ALTER TABLE public.notification_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on notification_configs" ON public.notification_configs FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 2. TABELA: Histórico de Notificações
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência ao alerta
  alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
  config_id UUID REFERENCES public.notification_configs(id) ON DELETE SET NULL,
  
  -- Canais utilizados
  channels_used TEXT[] NOT NULL,
  
  -- Resultados por canal
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Exemplo: {"email": {"success": true}, "whatsapp": {"success": false, "error": "..."}}
  
  -- Status geral
  success BOOLEAN DEFAULT false,
  
  -- Dados enviados
  payload JSONB,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_history_alert ON public.notification_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_created ON public.notification_history(created_at DESC);

ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on notification_history" ON public.notification_history FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 3. TABELA: Templates de Mensagem
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'email', 'whatsapp', 'webhook'
  
  -- Template
  subject_template TEXT, -- Para email
  body_template TEXT NOT NULL,
  -- Variáveis: {{severity}}, {{camera}}, {{type}}, {{message}}, {{timestamp}}, {{snapshot_url}}
  
  -- Ativo
  is_default BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on notification_templates" ON public.notification_templates FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 4. TEMPLATES PADRÃO
-- ============================================

-- Template de Email padrão
INSERT INTO public.notification_templates (name, channel, subject_template, body_template, is_default)
VALUES (
  'Email Padrão',
  'email',
  '[{{severity}}] Alerta VISÃO - {{camera}}',
  '<div style="font-family: Arial, sans-serif;">
    <h2 style="color: #EF4444;">⚠️ ALERTA VISÃO</h2>
    <p><strong>Severidade:</strong> {{severity}}</p>
    <p><strong>Câmera:</strong> {{camera}}</p>
    <p><strong>Tipo:</strong> {{type}}</p>
    <p><strong>Mensagem:</strong> {{message}}</p>
    <p><strong>Data/Hora:</strong> {{timestamp}}</p>
    {{#snapshot_url}}<img src="{{snapshot_url}}" style="max-width:100%;" />{{/snapshot_url}}
  </div>',
  true
)
ON CONFLICT DO NOTHING;

-- Template de WhatsApp padrão
INSERT INTO public.notification_templates (name, channel, body_template, is_default)
VALUES (
  'WhatsApp Padrão',
  'whatsapp',
  '🚨 *ALERTA VISÃO*

*Severidade:* {{severity}}
*Câmera:* {{camera}}
*Tipo:* {{type}}

*Mensagem:*
{{message}}

*Data/Hora:* {{timestamp}}',
  true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. FUNÇÃO: Processar Notificação de Alerta
-- ============================================

CREATE OR REPLACE FUNCTION public.process_alert_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_config RECORD;
  v_should_notify BOOLEAN;
BEGIN
  -- Buscar configurações de notificação habilitadas
  FOR v_config IN 
    SELECT * FROM public.notification_configs 
    WHERE enabled = true
  LOOP
    v_should_notify := true;
    
    -- Verificar filtro de severidade
    IF array_length(v_config.severity_filter, 1) > 0 THEN
      IF NOT (NEW.severity = ANY(v_config.severity_filter)) THEN
        v_should_notify := false;
      END IF;
    END IF;
    
    -- Verificar filtro de tipo
    IF v_should_notify AND array_length(v_config.type_filter, 1) > 0 THEN
      IF NOT (NEW.type = ANY(v_config.type_filter)) THEN
        v_should_notify := false;
      END IF;
    END IF;
    
    -- Verificar cooldown
    IF v_should_notify AND v_config.last_notification_at IS NOT NULL THEN
      IF (now() - v_config.last_notification_at) < (v_config.cooldown_minutes || ' minutes')::INTERVAL THEN
        v_should_notify := false;
      END IF;
    END IF;
    
    -- Verificar horário
    IF v_should_notify AND v_config.schedule_enabled THEN
      IF NOT (
        EXTRACT(DOW FROM now())::INTEGER = ANY(v_config.schedule_days)
        AND now()::TIME BETWEEN v_config.schedule_start_time AND v_config.schedule_end_time
      ) THEN
        v_should_notify := false;
      END IF;
    END IF;
    
    -- Se deve notificar, registrar na fila (será processado pela Edge Function)
    IF v_should_notify THEN
      -- Atualizar último envio
      UPDATE public.notification_configs 
      SET last_notification_at = now() 
      WHERE id = v_config.id;
      
      -- Inserir histórico (pendente)
      INSERT INTO public.notification_history (
        alert_id, config_id, channels_used, results, success, payload
      ) VALUES (
        NEW.id,
        v_config.id,
        v_config.channels,
        '{}'::jsonb,
        false,
        jsonb_build_object(
          'alertId', NEW.id,
          'type', NEW.type,
          'severity', NEW.severity,
          'message', NEW.message,
          'cameraName', NEW.camera_name,
          'timestamp', NEW.created_at,
          'channels', v_config.channels,
          'recipients', jsonb_build_object(
            'emails', v_config.email_recipients,
            'phones', v_config.phone_recipients,
            'webhookUrls', v_config.webhook_urls
          )
        )
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para processar notificações
DROP TRIGGER IF EXISTS trigger_alert_notification ON public.alerts;
CREATE TRIGGER trigger_alert_notification
AFTER INSERT ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.process_alert_notification();

-- ============================================
-- 6. VIEW: Dashboard de Notificações
-- ============================================

CREATE OR REPLACE VIEW public.notifications_dashboard AS
SELECT 
  nc.id,
  nc.name,
  nc.enabled,
  nc.channels,
  nc.severity_filter,
  array_length(nc.email_recipients, 1) as email_count,
  array_length(nc.phone_recipients, 1) as phone_count,
  nc.last_notification_at,
  (
    SELECT COUNT(*) 
    FROM public.notification_history nh 
    WHERE nh.config_id = nc.id 
    AND nh.created_at >= now() - INTERVAL '24 hours'
  ) as notifications_24h,
  (
    SELECT COUNT(*) 
    FROM public.notification_history nh 
    WHERE nh.config_id = nc.id 
    AND nh.success = true
    AND nh.created_at >= now() - INTERVAL '24 hours'
  ) as successful_24h
FROM public.notification_configs nc
ORDER BY nc.enabled DESC, nc.name;

-- ============================================
-- 7. CONFIGURAÇÃO PADRÃO DE EXEMPLO
-- ============================================

INSERT INTO public.notification_configs (
  name,
  description,
  enabled,
  channels,
  severity_filter,
  email_recipients,
  cooldown_minutes
) VALUES (
  'Alertas Críticos',
  'Notifica alertas de alta severidade por email',
  false, -- Desabilitado por padrão, usuário deve configurar
  '{"email"}',
  '{"high", "critical"}',
  '{}', -- Usuário deve adicionar emails
  5
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. VERIFICAÇÃO
-- ============================================

SELECT 'Configuração de notificações criada com sucesso!' as status;

SELECT 
  id,
  name,
  enabled,
  channels,
  severity_filter
FROM public.notification_configs;
