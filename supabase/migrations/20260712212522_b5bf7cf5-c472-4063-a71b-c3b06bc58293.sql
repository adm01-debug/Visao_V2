-- Partial index otimizado: cobre exatamente o filtro (user_id, is_active=true) usado por process-automation-rules.
-- Menor que um índice composto completo e evita heap scan quando o usuário tem muitas regras arquivadas.
CREATE INDEX IF NOT EXISTS idx_rules_user_active
  ON public.rules (user_id)
  WHERE is_active = true;

-- Mesma técnica para notification_configs: 99% das leituras filtram enabled=true.
CREATE INDEX IF NOT EXISTS idx_notification_configs_user_enabled
  ON public.notification_configs (user_id)
  WHERE enabled = true;

ANALYZE public.rules;
ANALYZE public.notification_configs;