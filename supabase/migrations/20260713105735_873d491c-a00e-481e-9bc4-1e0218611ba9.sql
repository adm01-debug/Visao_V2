-- FK index (missing)
CREATE INDEX IF NOT EXISTS idx_ealert_event_id ON public.event_alerts (event_id);

-- Partial index for the most common dashboard query: open alerts newest first
CREATE INDEX IF NOT EXISTS idx_ealert_open_org_time
  ON public.event_alerts (organization_id, triggered_at DESC)
  WHERE status = 'open';

-- Composite for severity+time filtering (dashboard timeline)
CREATE INDEX IF NOT EXISTS idx_ealert_org_sev_time
  ON public.event_alerts (organization_id, severity, triggered_at DESC);
