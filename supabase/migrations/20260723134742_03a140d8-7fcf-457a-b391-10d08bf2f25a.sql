
-- Retenção automática de telemetria de prévias: 30 dias
CREATE OR REPLACE FUNCTION public.prune_preview_telemetry_events()
RETURNS TABLE(deleted_rows BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n BIGINT;
BEGIN
  DELETE FROM public.preview_telemetry_events
   WHERE created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  deleted_rows := n;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_preview_telemetry_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prune_preview_telemetry_events() TO service_role;

-- Agenda diária às 03:15 UTC
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'prune-preview-telemetry-daily';
    PERFORM cron.schedule(
      'prune-preview-telemetry-daily',
      '15 3 * * *',
      $cron$ SELECT public.prune_preview_telemetry_events(); $cron$
    );
  END IF;
END $$;
