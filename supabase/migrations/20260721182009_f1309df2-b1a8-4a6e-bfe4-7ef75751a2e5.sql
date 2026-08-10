
ALTER TABLE public.alertmanager_silences_audit
  ADD COLUMN IF NOT EXISTS actor_email TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS request_id TEXT,
  ADD COLUMN IF NOT EXISTS justification TEXT;

CREATE INDEX IF NOT EXISTS idx_am_silence_audit_actor
  ON public.alertmanager_silences_audit (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_am_silence_audit_action_time
  ON public.alertmanager_silences_audit (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_am_silence_audit_silence
  ON public.alertmanager_silences_audit (silence_id)
  WHERE silence_id IS NOT NULL;

COMMENT ON COLUMN public.alertmanager_silences_audit.actor_email IS 'Email do admin que executou a ação (snapshot no momento).';
COMMENT ON COLUMN public.alertmanager_silences_audit.ip_address IS 'IP de origem (x-forwarded-for) da requisição.';
COMMENT ON COLUMN public.alertmanager_silences_audit.user_agent IS 'User-Agent do cliente que originou a ação.';
COMMENT ON COLUMN public.alertmanager_silences_audit.request_id IS 'Correlation ID para rastreio ponta-a-ponta.';
COMMENT ON COLUMN public.alertmanager_silences_audit.justification IS 'Justificativa obrigatória informada pelo operador (create/expire).';
