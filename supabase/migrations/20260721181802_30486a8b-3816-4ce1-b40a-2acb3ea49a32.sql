CREATE TABLE IF NOT EXISTS public.alertmanager_silences_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('create', 'from_alert', 'expire')),
  silence_id text,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  matchers jsonb,
  duration_minutes integer CHECK (duration_minutes IS NULL OR (duration_minutes BETWEEN 1 AND 10080)),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 500),
  status text NOT NULL CHECK (status IN ('ok', 'error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_am_silences_audit_created_at
  ON public.alertmanager_silences_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_am_silences_audit_actor
  ON public.alertmanager_silences_audit (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_am_silences_audit_silence_id
  ON public.alertmanager_silences_audit (silence_id) WHERE silence_id IS NOT NULL;

GRANT SELECT ON public.alertmanager_silences_audit TO authenticated;
GRANT ALL ON public.alertmanager_silences_audit TO service_role;

ALTER TABLE public.alertmanager_silences_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "am_silences_audit_admin_read" ON public.alertmanager_silences_audit;
CREATE POLICY "am_silences_audit_admin_read"
  ON public.alertmanager_silences_audit
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "am_silences_audit_no_update" ON public.alertmanager_silences_audit;
CREATE POLICY "am_silences_audit_no_update"
  ON public.alertmanager_silences_audit
  FOR UPDATE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "am_silences_audit_no_delete" ON public.alertmanager_silences_audit;
CREATE POLICY "am_silences_audit_no_delete"
  ON public.alertmanager_silences_audit
  FOR DELETE
  TO authenticated
  USING (false);