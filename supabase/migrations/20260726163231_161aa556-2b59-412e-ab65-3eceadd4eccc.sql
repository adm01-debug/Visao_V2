CREATE TABLE IF NOT EXISTS public.maintenance_alert_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.maintenance_alert_events(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('telegram','email')),
  status text NOT NULL CHECK (status IN ('sent','failed','skipped')),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts >= 0),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_alert_dispatches_pair_key UNIQUE (alert_id, channel)
);

GRANT SELECT ON public.maintenance_alert_dispatches TO authenticated;
GRANT ALL ON public.maintenance_alert_dispatches TO service_role;

ALTER TABLE public.maintenance_alert_dispatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem ver despachos de manutencao" ON public.maintenance_alert_dispatches;
CREATE POLICY "Admins podem ver despachos de manutencao"
  ON public.maintenance_alert_dispatches
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS maintenance_alert_dispatches_recent_idx
  ON public.maintenance_alert_dispatches (last_attempt_at DESC);

DROP TRIGGER IF EXISTS set_maintenance_alert_dispatches_updated_at ON public.maintenance_alert_dispatches;
CREATE TRIGGER set_maintenance_alert_dispatches_updated_at
  BEFORE UPDATE ON public.maintenance_alert_dispatches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
DECLARE
  proj_url text;
BEGIN
  proj_url := current_setting('app.settings.supabase_url', true);
  IF proj_url IS NULL THEN
    proj_url := 'https://fsisdfdwlbfeadwfqpir.supabase.co';
  END IF;

  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'maintenance-alerts-dispatch-hourly';

  PERFORM cron.schedule(
    'maintenance-alerts-dispatch-hourly',
    '33 * * * *',
    format(
      $cron$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body    := '{}'::jsonb,
        timeout_milliseconds := 20000
      );
      $cron$,
      proj_url || '/functions/v1/maintenance-alerts-dispatch'
    )
  );
END $$;