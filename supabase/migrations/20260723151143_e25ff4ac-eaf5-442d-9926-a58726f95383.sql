
CREATE OR REPLACE FUNCTION public.get_relay_agent_reliability(_hours integer DEFAULT 24)
RETURNS TABLE (
  agent_id uuid,
  agent_name text,
  total bigint,
  completed bigint,
  failed bigint,
  expired bigint,
  pending bigint,
  success_rate numeric,
  avg_latency_ms numeric,
  p95_latency_ms numeric,
  last_activity timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT t.*, a.name AS agent_name
    FROM public.agent_relay_tasks t
    JOIN public.local_agents a ON a.id = t.agent_id
    WHERE t.user_id = auth.uid()
      AND t.created_at >= now() - make_interval(hours => _hours)
  )
  SELECT
    s.agent_id,
    MAX(s.agent_name) AS agent_name,
    count(*) AS total,
    count(*) FILTER (WHERE s.status = 'completed') AS completed,
    count(*) FILTER (WHERE s.status = 'failed') AS failed,
    count(*) FILTER (WHERE s.status = 'expired') AS expired,
    count(*) FILTER (WHERE s.status IN ('pending','claimed')) AS pending,
    ROUND(
      100.0 * count(*) FILTER (WHERE s.status = 'completed')
      / NULLIF(count(*) FILTER (WHERE s.status IN ('completed','failed','expired')), 0),
      2
    ) AS success_rate,
    ROUND(AVG(EXTRACT(EPOCH FROM (s.completed_at - s.claimed_at)) * 1000)
      FILTER (WHERE s.completed_at IS NOT NULL AND s.claimed_at IS NOT NULL), 1) AS avg_latency_ms,
    ROUND(percentile_cont(0.95) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (s.completed_at - s.claimed_at)) * 1000
    ) FILTER (WHERE s.completed_at IS NOT NULL AND s.claimed_at IS NOT NULL)::numeric, 1) AS p95_latency_ms,
    MAX(COALESCE(s.completed_at, s.claimed_at, s.created_at)) AS last_activity
  FROM scoped s
  GROUP BY s.agent_id
  ORDER BY total DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_relay_agent_reliability(integer) TO authenticated;
