
CREATE TABLE IF NOT EXISTS public.edge_function_error_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  error_code TEXT NOT NULL,
  http_status INTEGER,
  target_ip TEXT,
  target_host TEXT,
  run_from TEXT NOT NULL DEFAULT 'cloud',
  relay_agent_id UUID,
  camera_id UUID,
  user_id UUID,
  request_id TEXT,
  message TEXT,
  hint TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT edge_error_run_from_chk CHECK (run_from IN ('cloud','relay','agent','client'))
);

GRANT SELECT ON public.edge_function_error_audit TO authenticated;
GRANT ALL ON public.edge_function_error_audit TO service_role;

ALTER TABLE public.edge_function_error_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_edge_errors"
  ON public.edge_function_error_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "service_role_writes_edge_errors"
  ON public.edge_function_error_audit
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_edge_error_created_at
  ON public.edge_function_error_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_error_function_code
  ON public.edge_function_error_audit (function_name, error_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_error_target_ip
  ON public.edge_function_error_audit (target_ip, created_at DESC)
  WHERE target_ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_edge_error_camera
  ON public.edge_function_error_audit (camera_id, created_at DESC)
  WHERE camera_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prune_edge_function_error_audit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed INTEGER;
BEGIN
  DELETE FROM public.edge_function_error_audit
   WHERE created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

-- Agendamento diário 03:15 UTC (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job WHERE jobname = 'prune_edge_function_error_audit_daily';
    PERFORM cron.schedule(
      'prune_edge_function_error_audit_daily',
      '15 3 * * *',
      $cron$SELECT public.prune_edge_function_error_audit();$cron$
    );
  END IF;
END $$;
