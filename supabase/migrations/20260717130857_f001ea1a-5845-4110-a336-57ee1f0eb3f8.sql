
CREATE TABLE public.csp_violation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_uri TEXT,
  referrer TEXT,
  violated_directive TEXT,
  effective_directive TEXT,
  original_policy TEXT,
  blocked_uri TEXT,
  source_file TEXT,
  line_number INTEGER,
  column_number INTEGER,
  disposition TEXT,
  status_code INTEGER,
  user_agent TEXT,
  ip_hash TEXT,
  raw_report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.csp_violation_reports TO authenticated;
GRANT ALL ON public.csp_violation_reports TO service_role;

ALTER TABLE public.csp_violation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view CSP reports"
  ON public.csp_violation_reports
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages CSP reports"
  ON public.csp_violation_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_csp_reports_created_at ON public.csp_violation_reports (created_at DESC);
CREATE INDEX idx_csp_reports_directive ON public.csp_violation_reports (violated_directive);
CREATE INDEX idx_csp_reports_blocked_uri ON public.csp_violation_reports (blocked_uri);
