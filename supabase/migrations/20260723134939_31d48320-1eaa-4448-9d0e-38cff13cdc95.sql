
DO $$
DECLARE
  proj_url TEXT;
  anon_key TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not available; skipping schedule';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net not available; skipping schedule';
    RETURN;
  END IF;

  proj_url := current_setting('app.settings.supabase_url', true);
  anon_key := current_setting('app.settings.supabase_anon_key', true);
  IF proj_url IS NULL THEN
    proj_url := 'https://fsisdfdwlbfeadwfqpir.supabase.co';
  END IF;

  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'preview-telemetry-alert-15min';

  PERFORM cron.schedule(
    'preview-telemetry-alert-15min',
    '*/15 * * * *',
    format(
      $cron$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body    := '{}'::jsonb,
        timeout_milliseconds := 15000
      );
      $cron$,
      proj_url || '/functions/v1/preview-telemetry-alert?window=1&min=50&th=0.9'
    )
  );
END $$;
