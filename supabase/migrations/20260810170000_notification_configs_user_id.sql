-- Adiciona user_id a notification_configs para compatibilidade com o hook
-- (a coluna original é created_by; o hook usa user_id).
ALTER TABLE public.notification_configs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_notification_configs_user
  ON public.notification_configs(user_id);