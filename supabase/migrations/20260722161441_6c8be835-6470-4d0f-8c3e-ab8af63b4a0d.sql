
CREATE TABLE IF NOT EXISTS public.rtsp_revalidation_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  interval_minutes INTEGER NOT NULL DEFAULT 15 CHECK (interval_minutes BETWEEN 1 AND 1440),
  targets TEXT[] NOT NULL DEFAULT ARRAY['primary','substream']::text[],
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_status TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (camera_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rtsp_revalidation_schedules TO authenticated;
GRANT ALL ON public.rtsp_revalidation_schedules TO service_role;

ALTER TABLE public.rtsp_revalidation_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rtsp_revalidation_owner_select" ON public.rtsp_revalidation_schedules
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rtsp_revalidation_owner_insert" ON public.rtsp_revalidation_schedules
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rtsp_revalidation_owner_update" ON public.rtsp_revalidation_schedules
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rtsp_revalidation_owner_delete" ON public.rtsp_revalidation_schedules
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rtsp_reval_due
  ON public.rtsp_revalidation_schedules (enabled, next_run_at);

CREATE OR REPLACE FUNCTION public.tg_rtsp_reval_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_rtsp_reval_touch ON public.rtsp_revalidation_schedules;
CREATE TRIGGER trg_rtsp_reval_touch BEFORE UPDATE ON public.rtsp_revalidation_schedules
  FOR EACH ROW EXECUTE FUNCTION public.tg_rtsp_reval_touch();

-- Agendamento pg_cron a cada minuto invocando a Edge Function
DO $$
DECLARE
  v_url text := 'https://fsisdfdwlbfeadwfqpir.supabase.co/functions/v1/rtsp-revalidate-scheduler';
  v_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzaXNkZmR3bGJmZWFkd2ZxcGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0ODQzNjQsImV4cCI6MjA5NDA2MDM2NH0.65ZNfgzGMJ6SanvfC9zaQyb_Sd2kO9wYohv52SHRD5s';
BEGIN
  PERFORM cron.unschedule('rtsp-revalidate-scheduler-every-minute')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rtsp-revalidate-scheduler-every-minute');
  PERFORM cron.schedule(
    'rtsp-revalidate-scheduler-every-minute',
    '* * * * *',
    format($f$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','apikey',%L),
        body := '{}'::jsonb
      );
    $f$, v_url, v_key)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cron.schedule skipped: %', SQLERRM;
END $$;
