
CREATE OR REPLACE FUNCTION public.check_relay_purge_watchdog()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_run timestamptz;
  hours_since numeric;
  already_alerted boolean;
BEGIN
  SELECT max(executed_at) INTO last_run FROM public.agent_relay_purge_runs;

  IF last_run IS NULL THEN
    hours_since := 999;
  ELSE
    hours_since := EXTRACT(EPOCH FROM (now() - last_run)) / 3600.0;
  END IF;

  IF hours_since < 36 THEN
    RETURN;
  END IF;

  -- Dedupe: se já existe alerta 'relay_purge_stalled' nas últimas 12h, não repete
  SELECT EXISTS (
    SELECT 1 FROM public.alerts
     WHERE type = 'relay_purge_stalled'
       AND created_at > now() - interval '12 hours'
  ) INTO already_alerted;

  IF already_alerted THEN
    RETURN;
  END IF;

  INSERT INTO public.alerts (user_id, type, severity, title, message, metadata)
  SELECT
    ur.user_id,
    'relay_purge_stalled',
    'high',
    'Purga de tarefas de relé parada',
    format(
      'A última execução da purga automática de agent_relay_tasks foi há %s horas. Verifique se o pg_cron está ativo.',
      round(hours_since, 1)
    ),
    jsonb_build_object(
      'last_run', last_run,
      'hours_since', round(hours_since, 1),
      'job_name', 'purge-agent-relay-tasks'
    )
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
END;
$$;

REVOKE ALL ON FUNCTION public.check_relay_purge_watchdog() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('relay-purge-watchdog');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'relay-purge-watchdog',
  '17 */6 * * *',
  $$SELECT public.check_relay_purge_watchdog();$$
);
