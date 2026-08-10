
-- Constraints defensivas na tabela alerts
ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_message_not_blank CHECK (length(btrim(message)) > 0) NOT VALID;

ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_camera_name_not_blank CHECK (length(btrim(camera_name)) > 0) NOT VALID;

ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_timestamp_not_future CHECK ("timestamp" <= now() + interval '5 minutes') NOT VALID;

-- Validar constraints em linhas existentes (falhas isoladas não bloqueiam o deploy futuro)
ALTER TABLE public.alerts VALIDATE CONSTRAINT alerts_message_not_blank;
ALTER TABLE public.alerts VALIDATE CONSTRAINT alerts_camera_name_not_blank;
ALTER TABLE public.alerts VALIDATE CONSTRAINT alerts_timestamp_not_future;

-- Índice para filtros por tipo (dashboard e relatórios)
CREATE INDEX IF NOT EXISTS idx_alerts_user_type_created
  ON public.alerts (user_id, type, created_at DESC);
