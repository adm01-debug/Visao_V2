
CREATE TABLE public.cron_watchdog_escalations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  jobname TEXT NOT NULL,
  consecutive_failures INTEGER NOT NULL,
  last_reason TEXT,
  delivered BOOLEAN NOT NULL DEFAULT false,
  delivery_error TEXT,
  dedup_key TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cron_watchdog_escalations_escalated_at
  ON public.cron_watchdog_escalations (escalated_at DESC);
CREATE INDEX idx_cron_watchdog_escalations_jobname
  ON public.cron_watchdog_escalations (jobname, escalated_at DESC);

GRANT SELECT ON public.cron_watchdog_escalations TO authenticated;
GRANT ALL ON public.cron_watchdog_escalations TO service_role;

ALTER TABLE public.cron_watchdog_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view escalations"
  ON public.cron_watchdog_escalations
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages escalations"
  ON public.cron_watchdog_escalations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Retenção 90 dias
CREATE OR REPLACE FUNCTION public.prune_cron_watchdog_escalations()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.cron_watchdog_escalations
  WHERE escalated_at < now() - INTERVAL '90 days';
$$;

SELECT cron.schedule(
  'prune-cron-watchdog-escalations-daily',
  '15 3 * * *',
  $$SELECT public.prune_cron_watchdog_escalations();$$
);
