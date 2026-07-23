
CREATE TABLE IF NOT EXISTS public.cron_watchdog_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  jobs_total INTEGER NOT NULL DEFAULT 0,
  problems INTEGER NOT NULL DEFAULT 0,
  alerts_sent INTEGER NOT NULL DEFAULT 0,
  dedup_skipped INTEGER NOT NULL DEFAULT 0,
  delivered BOOLEAN NOT NULL DEFAULT false,
  delivery_error TEXT,
  min_failures INTEGER NOT NULL,
  stale_minutes INTEGER NOT NULL,
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cron_watchdog_runs TO authenticated;
GRANT ALL ON public.cron_watchdog_runs TO service_role;

ALTER TABLE public.cron_watchdog_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cron watchdog runs"
  ON public.cron_watchdog_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages cron watchdog runs"
  ON public.cron_watchdog_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cron_watchdog_runs_ran_at
  ON public.cron_watchdog_runs (ran_at DESC);

-- Retenção: manter 30 dias
CREATE OR REPLACE FUNCTION public.prune_cron_watchdog_runs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.cron_watchdog_runs WHERE ran_at < now() - interval '30 days';
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-cron-watchdog-runs-daily') THEN
    PERFORM cron.unschedule('prune-cron-watchdog-runs-daily');
  END IF;
  PERFORM cron.schedule(
    'prune-cron-watchdog-runs-daily',
    '17 3 * * *',
    $cron$ SELECT public.prune_cron_watchdog_runs(); $cron$
  );
END $$;
