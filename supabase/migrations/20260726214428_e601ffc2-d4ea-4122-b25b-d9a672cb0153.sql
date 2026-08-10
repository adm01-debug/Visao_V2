-- Onda 134: registro único das rotinas de expurgo + limiares por cadência.

CREATE OR REPLACE FUNCTION public.retention_routine_registry()
RETURNS TABLE (job_name text, source_table text, cadence_minutes integer, label text)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT * FROM (VALUES
    ('agent_discoveries',   'agent_discoveries_purge_runs',   1440, 'Descobertas de agentes locais'),
    ('agent_relay_tasks',   'agent_relay_purge_runs',         1440, 'Tarefas de relay dos agentes'),
    ('collab_entries',      'collab_entry_purge_runs',        1440, 'Entradas da rede colaborativa'),
    ('collab_notifications','collab_notification_purge_runs',   60, 'Avisos da rede colaborativa')
  ) AS t(job_name, source_table, cadence_minutes, label);
$$;

CREATE OR REPLACE FUNCTION public.retention_health_thresholds()
RETURNS TABLE (grace_minutes integer, warn_factor integer, stalled_factor integer)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT 15, 2, 4 $$;

CREATE OR REPLACE FUNCTION public.classify_retention_health(
  p_minutes_since numeric,
  p_cadence_minutes integer
) RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_minutes_since IS NULL THEN 'never'
    WHEN GREATEST(p_minutes_since, 0) < 2 * p_cadence_minutes + 15 THEN 'ok'
    WHEN GREATEST(p_minutes_since, 0) < 4 * p_cadence_minutes + 15 THEN 'warn'
    ELSE 'stalled'
  END;
$$;

DROP FUNCTION IF EXISTS public.get_retention_overview();

CREATE FUNCTION public.get_retention_overview(p_now timestamptz DEFAULT now())
RETURNS TABLE (
  job_name text,
  label text,
  cadence_minutes integer,
  last_run timestamptz,
  minutes_since_last numeric,
  hours_since_last numeric,
  health text,
  runs_last_30d bigint,
  deleted_last_30d bigint,
  retention_days integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
  WITH stats AS (
    SELECT 'agent_relay_tasks'::text AS job_name,
           max(r.executed_at) AS last_run,
           count(*) FILTER (WHERE r.executed_at > p_now - interval '30 days') AS runs_30d,
           COALESCE(sum(r.deleted_count) FILTER (WHERE r.executed_at > p_now - interval '30 days'), 0)::bigint AS deleted_30d,
           (SELECT x.retention_days FROM public.agent_relay_purge_runs x ORDER BY x.executed_at DESC LIMIT 1) AS ret_days
      FROM public.agent_relay_purge_runs r
    UNION ALL
    SELECT 'agent_discoveries'::text,
           max(r.executed_at),
           count(*) FILTER (WHERE r.executed_at > p_now - interval '30 days'),
           COALESCE(sum(r.deleted_count) FILTER (WHERE r.executed_at > p_now - interval '30 days'), 0)::bigint,
           (SELECT x.retention_days FROM public.agent_discoveries_purge_runs x ORDER BY x.executed_at DESC LIMIT 1)
      FROM public.agent_discoveries_purge_runs r
    UNION ALL
    SELECT 'collab_notifications'::text,
           max(r.executed_at),
           count(*) FILTER (WHERE r.executed_at > p_now - interval '30 days'),
           COALESCE(sum(r.deleted_notifications + r.deleted_silences) FILTER (WHERE r.executed_at > p_now - interval '30 days'), 0)::bigint,
           (SELECT x.hard_ceiling_days FROM public.collab_notification_purge_runs x ORDER BY x.executed_at DESC LIMIT 1)
      FROM public.collab_notification_purge_runs r
    UNION ALL
    SELECT 'collab_entries'::text,
           max(r.executed_at),
           count(*) FILTER (WHERE r.executed_at > p_now - interval '30 days'),
           COALESCE(sum(r.deleted_entries + r.deleted_matches) FILTER (WHERE r.executed_at > p_now - interval '30 days'), 0)::bigint,
           (SELECT (x.policy->>'matchRetentionDays')::int FROM public.collab_entry_purge_runs x ORDER BY x.executed_at DESC LIMIT 1)
      FROM public.collab_entry_purge_runs r
  )
  SELECT
    reg.job_name,
    reg.label,
    reg.cadence_minutes,
    s.last_run,
    CASE WHEN s.last_run IS NULL THEN NULL
         ELSE round(EXTRACT(EPOCH FROM (p_now - s.last_run))::numeric / 60.0, 1) END,
    CASE WHEN s.last_run IS NULL THEN NULL
         ELSE round(EXTRACT(EPOCH FROM (p_now - s.last_run))::numeric / 3600.0, 1) END,
    public.classify_retention_health(
      CASE WHEN s.last_run IS NULL THEN NULL
           ELSE EXTRACT(EPOCH FROM (p_now - s.last_run))::numeric / 60.0 END,
      reg.cadence_minutes),
    COALESCE(s.runs_30d, 0),
    COALESCE(s.deleted_30d, 0),
    s.ret_days
  FROM public.retention_routine_registry() reg
  LEFT JOIN stats s ON s.job_name = reg.job_name
  ORDER BY reg.job_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_retention_overview(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_retention_overview(timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.retention_routine_registry() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retention_routine_registry() TO authenticated;
REVOKE ALL ON FUNCTION public.retention_health_thresholds() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retention_health_thresholds() TO authenticated;
REVOKE ALL ON FUNCTION public.classify_retention_health(numeric, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.classify_retention_health(numeric, integer) TO authenticated;