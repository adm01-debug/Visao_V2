
CREATE TABLE public.agent_discoveries_purge_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retention_days INTEGER NOT NULL,
  deleted_count BIGINT NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agent_discoveries_purge_runs TO authenticated;
GRANT ALL ON public.agent_discoveries_purge_runs TO service_role;

ALTER TABLE public.agent_discoveries_purge_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view discoveries purge runs"
  ON public.agent_discoveries_purge_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_agent_discoveries_purge_runs_executed_at
  ON public.agent_discoveries_purge_runs (executed_at DESC);

-- Índice de apoio para purga por discovered_at
CREATE INDEX IF NOT EXISTS idx_agent_discoveries_discovered_at
  ON public.agent_discoveries (discovered_at);

CREATE OR REPLACE FUNCTION public.purge_agent_discoveries(_retention_days integer DEFAULT 90)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  del_count bigint := 0;
  started_at timestamptz := clock_timestamp();
BEGIN
  WITH del AS (
    DELETE FROM public.agent_discoveries
     WHERE discovered_at < now() - make_interval(days => _retention_days)
    RETURNING 1
  )
  SELECT count(*) INTO del_count FROM del;

  INSERT INTO public.agent_discoveries_purge_runs
    (retention_days, deleted_count, duration_ms)
  VALUES
    (_retention_days, del_count,
     GREATEST(0, (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::int));

  RETURN del_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_agent_discoveries(integer) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('purge-agent-discoveries');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'purge-agent-discoveries',
  '35 3 * * *',
  $$SELECT public.purge_agent_discoveries(90);$$
);
