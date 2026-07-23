
CREATE TABLE public.dry_run_report_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NULL,
  session_started_at TIMESTAMPTZ NULL,
  session_expires_at TIMESTAMPTZ NULL,
  scope TEXT NULL,
  scope_ids UUID[] NULL,
  title TEXT NOT NULL DEFAULT 'Relatório Dry-Run',
  total_events INTEGER NOT NULL DEFAULT 0,
  total_notifying INTEGER NOT NULL DEFAULT 0,
  total_suppressed INTEGER NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dry_run_report_snapshots TO authenticated;
GRANT ALL ON public.dry_run_report_snapshots TO service_role;

ALTER TABLE public.dry_run_report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dry-run snapshots"
  ON public.dry_run_report_snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all dry-run snapshots"
  ON public.dry_run_report_snapshots FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_dry_run_snapshots_user_created
  ON public.dry_run_report_snapshots (user_id, created_at DESC);
CREATE INDEX idx_dry_run_snapshots_session
  ON public.dry_run_report_snapshots (session_id);

CREATE TRIGGER update_dry_run_snapshots_updated_at
  BEFORE UPDATE ON public.dry_run_report_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
