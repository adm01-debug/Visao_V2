-- Onda 121: lease de execução + reentrega limitada
ALTER TABLE public.agent_relay_tasks
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.agent_relay_tasks
  DROP CONSTRAINT IF EXISTS agent_relay_tasks_attempts_sane;
ALTER TABLE public.agent_relay_tasks
  ADD CONSTRAINT agent_relay_tasks_attempts_sane CHECK (attempts >= 0 AND attempts <= 10);

CREATE INDEX IF NOT EXISTS idx_agent_relay_tasks_lease
  ON public.agent_relay_tasks (lease_expires_at)
  WHERE status = 'in_progress';

-- Política da Onda 121 (espelha src/lib/relayLease.ts)
CREATE OR REPLACE FUNCTION public.relay_lease_policy()
RETURNS TABLE (
  lease_seconds integer,
  max_attempts integer,
  backoff_base_seconds integer,
  backoff_max_seconds integer,
  min_window_seconds integer,
  hard_deadline_seconds integer
)
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$ SELECT 45, 3, 5, 60, 60, 3600 $$;

-- claim passa a conceder um empréstimo com prazo e a contar tentativas
CREATE OR REPLACE FUNCTION public.claim_agent_relay_tasks(_agent_id uuid, _max integer DEFAULT 4)
RETURNS SETOF public.agent_relay_tasks
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH pol AS (SELECT * FROM public.relay_lease_policy()),
  picked AS (
    SELECT t.id
      FROM public.agent_relay_tasks t, pol
     WHERE t.agent_id = _agent_id
       AND t.status = 'pending'
       AND t.expires_at > now()
       AND t.scheduled_at <= now()
       AND t.attempts < pol.max_attempts
     ORDER BY t.created_at
     FOR UPDATE SKIP LOCKED
     LIMIT greatest(1, least(_max, 16))
  )
  UPDATE public.agent_relay_tasks t
     SET status = 'in_progress',
         claimed_at = now(),
         attempts = t.attempts + 1,
         lease_expires_at = now() + make_interval(secs => (SELECT lease_seconds FROM pol))
    FROM picked
   WHERE t.id = picked.id
  RETURNING t.*;
$function$;

-- Reaper: executa o plano puro descrito em src/lib/relayLease.ts
CREATE OR REPLACE FUNCTION public.reap_agent_relay_leases()
RETURNS TABLE (requeued integer, expired integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pol record;
  v_requeued integer := 0;
  v_expired integer := 0;
BEGIN
  SELECT * INTO pol FROM public.relay_lease_policy();

  -- 1) Lease vencido, ainda cabe reentrega dentro do prazo final
  WITH candidates AS (
    SELECT t.id,
           least(pol.backoff_max_seconds,
                 pol.backoff_base_seconds * power(2, greatest(t.attempts, 1) - 1))::int AS wait_s
      FROM public.agent_relay_tasks t
     WHERE t.status = 'in_progress'
       AND (t.lease_expires_at IS NULL OR t.lease_expires_at <= now())
       AND t.attempts < pol.max_attempts
     FOR UPDATE SKIP LOCKED
  ), requeue AS (
    UPDATE public.agent_relay_tasks t
       SET status = 'pending',
           claimed_at = NULL,
           lease_expires_at = NULL,
           last_error = 'lease_expired_requeued',
           scheduled_at = now() + make_interval(secs => c.wait_s),
           expires_at = now() + make_interval(secs => c.wait_s + pol.min_window_seconds)
      FROM candidates c
     WHERE t.id = c.id
       AND (now() + make_interval(secs => c.wait_s + pol.min_window_seconds))
             <= t.created_at + make_interval(secs => pol.hard_deadline_seconds)
    RETURNING 1
  )
  SELECT count(*)::int INTO v_requeued FROM requeue;

  -- 2) Lease vencido sem reentrega possível: teto de tentativas ou prazo final
  WITH terminal AS (
    UPDATE public.agent_relay_tasks t
       SET status = 'expired',
           completed_at = now(),
           lease_expires_at = NULL,
           error = COALESCE(t.error,
             CASE WHEN t.attempts >= pol.max_attempts
                  THEN 'task_expired_attempts_exhausted'
                  ELSE 'task_expired_deadline' END)
     WHERE t.status = 'in_progress'
       AND (t.lease_expires_at IS NULL OR t.lease_expires_at <= now())
    RETURNING 1
  )
  SELECT count(*)::int INTO v_expired FROM terminal;

  RETURN QUERY SELECT v_requeued, v_expired;
END;
$function$;

-- Expiração das tarefas nunca reivindicadas (Onda 119) + reaper de lease
CREATE OR REPLACE FUNCTION public.expire_agent_relay_tasks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_expired integer := 0;
  v_lease record;
BEGIN
  SELECT * INTO v_lease FROM public.reap_agent_relay_leases();

  WITH expired AS (
    UPDATE public.agent_relay_tasks
       SET status = 'expired',
           completed_at = now(),
           error = COALESCE(error,
             CASE WHEN (expires_at - scheduled_at) < interval '60 seconds'
                    THEN 'task_expired_unfair_window'
                  ELSE 'task_expired_unclaimed' END)
     WHERE status = 'pending'
       AND expires_at < now()
    RETURNING 1
  )
  SELECT count(*)::int INTO v_expired FROM expired;

  RETURN v_expired + COALESCE(v_lease.expired, 0);
END;
$function$;

-- Correção: o status de sucesso é 'done', não 'completed' (alarme falso)
CREATE OR REPLACE FUNCTION public.check_relay_reliability_and_alert()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        count(*) FILTER (WHERE t.status IN ('done','failed')) AS ok_count,
        count(*) FILTER (
          WHERE t.status IN ('done','failed')
             OR (t.status = 'expired'
                 AND COALESCE(t.error,'') NOT IN ('task_expired_unfair_window','task_expired_deadline'))
        ) AS finished
      FROM public.agent_relay_tasks t
      JOIN public.local_agents a ON a.id = t.agent_id
      WHERE t.created_at >= now() - interval '30 minutes'
      GROUP BY t.agent_id, t.user_id, a.name
    )
    SELECT w.*, ROUND(100.0 * w.ok_count / NULLIF(w.finished, 0), 2) AS success_rate
    FROM windowed w
    WHERE w.finished >= 10
      AND (100.0 * w.ok_count / NULLIF(w.finished, 0)) < 70
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.alerts
      WHERE user_id = r.user_id
        AND type = 'operations'
        AND message LIKE 'Agente Local degradado: ' || r.agent_name || '%'
        AND created_at >= date_trunc('hour', now())
    ) THEN
      INSERT INTO public.alerts (user_id, camera_name, type, severity, message, is_read, is_test)
      VALUES (
        r.user_id, r.agent_name, 'operations',
        CASE WHEN r.success_rate < 40 THEN 'high'::alert_severity ELSE 'medium'::alert_severity END,
        'Agente Local degradado: ' || r.agent_name
          || ' — ' || r.success_rate || '% de sucesso em ' || r.finished
          || ' tarefas nos últimos 30 min.',
        false, false
      );
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;
  RETURN inserted_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.relay_lease_policy() FROM anon;
REVOKE ALL ON FUNCTION public.reap_agent_relay_leases() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reap_agent_relay_leases() TO service_role;