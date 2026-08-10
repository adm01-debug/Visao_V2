
CREATE OR REPLACE FUNCTION public.check_relay_reliability_and_alert()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
  r record;
BEGIN
  FOR r IN
    WITH windowed AS (
      SELECT
        t.agent_id,
        t.user_id,
        a.name AS agent_name,
        count(*) AS total,
        count(*) FILTER (WHERE t.status = 'completed') AS ok_count,
        count(*) FILTER (WHERE t.status IN ('completed','failed','expired')) AS finished
      FROM public.agent_relay_tasks t
      JOIN public.local_agents a ON a.id = t.agent_id
      WHERE t.created_at >= now() - interval '30 minutes'
      GROUP BY t.agent_id, t.user_id, a.name
    )
    SELECT
      w.*,
      ROUND(100.0 * w.ok_count / NULLIF(w.finished, 0), 2) AS success_rate
    FROM windowed w
    WHERE w.finished >= 10
      AND (100.0 * w.ok_count / NULLIF(w.finished, 0)) < 70
  LOOP
    -- Dedupe: evita duplicar alerta do mesmo agente na mesma hora
    IF NOT EXISTS (
      SELECT 1 FROM public.alerts
      WHERE user_id = r.user_id
        AND type = 'operations'
        AND message LIKE 'Agente Local degradado: ' || r.agent_name || '%'
        AND created_at >= date_trunc('hour', now())
    ) THEN
      INSERT INTO public.alerts (user_id, camera_name, type, severity, message, is_read, is_test)
      VALUES (
        r.user_id,
        r.agent_name,
        'operations',
        CASE WHEN r.success_rate < 40 THEN 'high'::alert_severity ELSE 'medium'::alert_severity END,
        'Agente Local degradado: ' || r.agent_name
          || ' — ' || r.success_rate || '% de sucesso em ' || r.finished
          || ' tarefas nos últimos 30 min.',
        false,
        false
      );
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.check_relay_reliability_and_alert() FROM PUBLIC, anon, authenticated;

-- Agenda a cada 15 minutos (idempotente)
DO $$
BEGIN
  PERFORM cron.unschedule('relay-reliability-check');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'relay-reliability-check',
  '*/15 * * * *',
  $$SELECT public.check_relay_reliability_and_alert();$$
);
