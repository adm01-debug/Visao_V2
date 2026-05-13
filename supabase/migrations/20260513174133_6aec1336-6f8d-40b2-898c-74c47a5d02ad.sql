ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info',
ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.audit_logs.severity IS 'Nível de severidade: info, warning, error, critical';
COMMENT ON COLUMN public.audit_logs.details IS 'JSON com detalhes adicionais do evento auditado';