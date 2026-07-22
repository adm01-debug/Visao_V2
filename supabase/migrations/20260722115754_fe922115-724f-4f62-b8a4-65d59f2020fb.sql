
-- 1) Tabela append-only
CREATE TABLE IF NOT EXISTS public.camera_vault_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID,
  actor_role TEXT,
  action TEXT NOT NULL,
  camera_id UUID,
  kek_version_from SMALLINT,
  kek_version_to SMALLINT,
  affected_rows INT,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  ip TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS camera_vault_audit_created_at_idx
  ON public.camera_vault_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS camera_vault_audit_action_idx
  ON public.camera_vault_audit (action, created_at DESC);
CREATE INDEX IF NOT EXISTS camera_vault_audit_camera_idx
  ON public.camera_vault_audit (camera_id, created_at DESC)
  WHERE camera_id IS NOT NULL;

-- 2) GRANTs (política controla acesso real)
GRANT SELECT ON public.camera_vault_audit TO authenticated;
GRANT ALL ON public.camera_vault_audit TO service_role;

-- 3) RLS
ALTER TABLE public.camera_vault_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vault_audit_admin_read" ON public.camera_vault_audit;
CREATE POLICY "vault_audit_admin_read"
  ON public.camera_vault_audit
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "vault_audit_service_insert" ON public.camera_vault_audit;
CREATE POLICY "vault_audit_service_insert"
  ON public.camera_vault_audit
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 4) Imutabilidade
CREATE OR REPLACE FUNCTION public.prevent_vault_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'camera_vault_audit is append-only';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_vault_audit_mutation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_vault_audit_mutation() TO service_role;

DROP TRIGGER IF EXISTS trg_vault_audit_no_update ON public.camera_vault_audit;
CREATE TRIGGER trg_vault_audit_no_update
  BEFORE UPDATE OR DELETE ON public.camera_vault_audit
  FOR EACH ROW EXECUTE FUNCTION public.prevent_vault_audit_mutation();

-- 5) View de cobertura (severidade)
CREATE OR REPLACE VIEW public.camera_vault_coverage_alerts
WITH (security_invoker = true)
AS
WITH stats AS (
  SELECT
    COUNT(*)::INT AS total,
    COUNT(*) FILTER (WHERE dek_wrapped IS NOT NULL)::INT AS enveloped,
    COUNT(*) FILTER (WHERE encrypted_password IS NOT NULL AND dek_wrapped IS NULL)::INT AS legacy,
    MIN(wrapped_at) FILTER (WHERE dek_wrapped IS NOT NULL) AS oldest_wrap
  FROM public.camera_credentials
)
SELECT
  total, enveloped, legacy, oldest_wrap,
  CASE
    WHEN legacy = 0 THEN 'ok'
    WHEN legacy > 0 AND (oldest_wrap IS NULL OR now() - oldest_wrap > INTERVAL '24 hours') THEN 'critical'
    ELSE 'warn'
  END AS severity
FROM stats;

REVOKE ALL ON public.camera_vault_coverage_alerts FROM PUBLIC, anon;
GRANT SELECT ON public.camera_vault_coverage_alerts TO authenticated, service_role;
