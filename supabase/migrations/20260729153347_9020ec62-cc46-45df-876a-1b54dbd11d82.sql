-- Onda 245 — o painel de expurgo enxerga TODAS as rotinas e respeita a carência de estreia.
--
-- Dois defeitos corrigidos:
--   1) get_retention_overview() só somava 4 das 8 rotinas registradas. As
--      quatro nascidas depois da Onda 134 (admission_ledger, admission_reconcile,
--      alarm_recurrence, dispatch_suppressions) apareciam com last_run NULL
--      mesmo executando — o LEFT JOIN não tinha origem para elas. O painel
--      mentia: rotina saudável exibida como "nunca executou".
--   2) A carência de estreia da Onda 244 existia em evaluate_retention_alerts
--      mas não no painel: classify_retention_health era chamada com 2 argumentos
--      e devolvia 'never' para toda rotina nova.

-- Sobrecarga de 3 argumentos: espelho literal de classifyRetentionHealth do TS.
CREATE OR REPLACE FUNCTION public.classify_retention_health(
  p_minutes_since numeric,
  p_cadence_minutes integer,
  p_minutes_since_registration numeric
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_minutes_since IS NULL THEN
      CASE
        WHEN p_minutes_since_registration IS NULL THEN 'never'
        WHEN GREATEST(p_minutes_since_registration, 0) < p_cadence_minutes + 15
          THEN 'pending_first_run'
        ELSE 'never'
      END
    WHEN GREATEST(p_minutes_since, 0) < 2 * p_cadence_minutes + 15 THEN 'ok'
    WHEN GREATEST(p_minutes_since, 0) < 4 * p_cadence_minutes + 15 THEN 'warn'
    ELSE 'stalled'
  END;
$function$;

DROP FUNCTION IF EXISTS public.get_retention_overview(timestamptz);

CREATE FUNCTION public.get_retention_overview(p_now timestamptz DEFAULT now())
RETURNS TABLE(
  job_name text,
  label text,
  cadence_minutes integer,
  last_run timestamptz,
  minutes_since_last numeric,
  hours_since_last numeric,
  health text,
  runs_last_30d bigint,
  deleted_last_30d bigint,
  retention_days integer,
  registered_at timestamptz,
  minutes_since_registration numeric,
  debut_due_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    UNION ALL
    SELECT 'admission_ledger'::text,
           max(r.executed_at),
           count(*) FILTER (WHERE r.executed_at > p_now - interval '30 days'),
           COALESCE(sum(r.deleted_count) FILTER (WHERE r.executed_at > p_now - interval '30 days'), 0)::bigint,
           (SELECT x.retention_days FROM public.admission_ledger_purge_runs x ORDER BY x.executed_at DESC LIMIT 1)
      FROM public.admission_ledger_purge_runs r
    UNION ALL
    SELECT 'admission_reconcile'::text,
           max(r.executed_at),
           count(*) FILTER (WHERE r.executed_at > p_now - interval '30 days'),
           COALESCE(sum(r.deleted_count) FILTER (WHERE r.executed_at > p_now - interval '30 days'), 0)::bigint,
           (SELECT x.retention_days FROM public.admission_reconcile_purge_runs x ORDER BY x.executed_at DESC LIMIT 1)
      FROM public.admission_reconcile_purge_runs r
    UNION ALL
    SELECT 'alarm_recurrence'::text,
           max(r.executed_at),
           count(*) FILTER (WHERE r.executed_at > p_now - interval '30 days'),
           COALESCE(sum(r.deleted_episodes) FILTER (WHERE r.executed_at > p_now - interval '30 days'), 0)::bigint,
           (SELECT (x.policy->>'retentionDays')::int FROM public.alarm_recurrence_purge_runs x ORDER BY x.executed_at DESC LIMIT 1)
      FROM public.alarm_recurrence_purge_runs r
    UNION ALL
    SELECT 'dispatch_suppressions'::text,
           max(r.executed_at),
           count(*) FILTER (WHERE r.executed_at > p_now - interval '30 days'),
           COALESCE(sum(r.deleted_count) FILTER (WHERE r.executed_at > p_now - interval '30 days'), 0)::bigint,
           (SELECT x.retention_days FROM public.maintenance_suppression_purge_runs x ORDER BY x.executed_at DESC LIMIT 1)
      FROM public.maintenance_suppression_purge_runs r
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
      reg.cadence_minutes,
      CASE WHEN reg.registered_at IS NULL OR reg.registered_at > p_now THEN NULL
           ELSE EXTRACT(EPOCH FROM (p_now - reg.registered_at))::numeric / 60.0 END),
    COALESCE(s.runs_30d, 0),
    COALESCE(s.deleted_30d, 0),
    s.ret_days,
    reg.registered_at,
    CASE WHEN reg.registered_at IS NULL OR reg.registered_at > p_now THEN NULL
         ELSE round(EXTRACT(EPOCH FROM (p_now - reg.registered_at))::numeric / 60.0, 1) END,
    CASE WHEN reg.registered_at IS NULL THEN NULL
         ELSE reg.registered_at + make_interval(mins => reg.cadence_minutes + 15) END
  FROM public.retention_routine_registry() reg
  LEFT JOIN stats s ON s.job_name = reg.job_name
  ORDER BY reg.job_name;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_retention_overview(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_retention_overview(timestamptz) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.classify_retention_health(numeric, integer, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.classify_retention_health(numeric, integer, numeric) TO authenticated, service_role;