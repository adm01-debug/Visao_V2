
CREATE TABLE IF NOT EXISTS public.media_forget_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by UUID NOT NULL,
  executed_by UUID NOT NULL,
  subject_user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  hot_deleted INT NOT NULL DEFAULT 0,
  warm_deleted INT NOT NULL DEFAULT 0,
  cold_deleted INT NOT NULL DEFAULT 0,
  legal_hold_skipped INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  dry_run BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.media_forget_audit TO authenticated;
GRANT ALL ON public.media_forget_audit TO service_role;

ALTER TABLE public.media_forget_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver auditoria de esquecimento"
  ON public.media_forget_audit
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role insere auditoria"
  ON public.media_forget_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bloqueia UPDATE/DELETE definitivamente (imutabilidade)
CREATE OR REPLACE FUNCTION public.block_media_forget_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'media_forget_audit é imutável (LGPD)';
END;
$$;

DROP TRIGGER IF EXISTS trg_block_media_forget_audit_upd ON public.media_forget_audit;
CREATE TRIGGER trg_block_media_forget_audit_upd
  BEFORE UPDATE OR DELETE ON public.media_forget_audit
  FOR EACH ROW EXECUTE FUNCTION public.block_media_forget_audit_mutation();

CREATE INDEX IF NOT EXISTS idx_media_forget_audit_subject
  ON public.media_forget_audit (subject_user_id, created_at DESC);
