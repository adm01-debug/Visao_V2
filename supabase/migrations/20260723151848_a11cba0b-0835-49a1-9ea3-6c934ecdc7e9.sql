
CREATE TABLE public.agent_relay_purge_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retention_days INTEGER NOT NULL,
  deleted_count BIGINT NOT NULL DEFAULT 0,
  expired_count BIGINT NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agent_relay_purge_runs TO authenticated;
GRANT ALL ON public.agent_relay_purge_runs TO service_role;

ALTER TABLE public.agent_relay_purge_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view purge runs"
  ON public.agent_relay_purge_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_agent_relay_purge_runs_executed_at
  ON public.agent_relay_purge_runs (executed_at DESC);

CREATE OR REPLACE FUNCTION public.purge_agent_relay_tasks(_retention_days integer DEFAULT 30)
RETURNS TABLE (deleted bigint, expired bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  del_count bigint := 0;
  exp_count bigint := 0;
  started_at timestamptz := clock_timestamp();
BEGIN
  WITH upd AS (
    UPDATE public.agent_relay_tasks
       SET status = 'expired'
     WHERE status IN ('pending','claimed')
       AND expires_at IS NOT NULL
       AND expires_at < now() - interval '1 hour'
    RETURNING 1
  )
  SELECT count(*) INTO exp_count FROM upd;

  WITH del AS (
    DELETE FROM public.agent_relay_tasks
     WHERE status IN ('completed','failed','expired')
       AND created_at < now() - make_interval(days => _retention_days)
    RETURNING 1
  )
  SELECT count(*) INTO del_count FROM del;

  INSERT INTO public.agent_relay_purge_runs
    (retention_days, deleted_count, expired_count, duration_ms)
  VALUES
    (_retention_days, del_count, exp_count,
     GREATEST(0, (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::int));

  RETURN QUERY SELECT del_count, exp_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_agent_relay_tasks(integer) FROM PUBLIC, anon, authenticated;
