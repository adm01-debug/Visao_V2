
CREATE OR REPLACE FUNCTION public.purge_agent_relay_tasks(_retention_days integer DEFAULT 30)
RETURNS TABLE (deleted bigint, expired bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  del_count bigint := 0;
  exp_count bigint := 0;
BEGIN
  -- 1) Expira tarefas pendentes/reclamadas cujo expires_at já passou (>1h de folga)
  WITH upd AS (
    UPDATE public.agent_relay_tasks
       SET status = 'expired'
     WHERE status IN ('pending','claimed')
       AND expires_at IS NOT NULL
       AND expires_at < now() - interval '1 hour'
    RETURNING 1
  )
  SELECT count(*) INTO exp_count FROM upd;

  -- 2) Remove tarefas finalizadas com mais de _retention_days dias
  WITH del AS (
    DELETE FROM public.agent_relay_tasks
     WHERE status IN ('completed','failed','expired')
       AND created_at < now() - make_interval(days => _retention_days)
    RETURNING 1
  )
  SELECT count(*) INTO del_count FROM del;

  RETURN QUERY SELECT del_count, exp_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_agent_relay_tasks(integer) FROM PUBLIC, anon, authenticated;

-- Agenda diária (03:15 UTC) — idempotente
DO $$
BEGIN
  PERFORM cron.unschedule('purge-agent-relay-tasks');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'purge-agent-relay-tasks',
  '15 3 * * *',
  $$SELECT public.purge_agent_relay_tasks(30);$$
);
