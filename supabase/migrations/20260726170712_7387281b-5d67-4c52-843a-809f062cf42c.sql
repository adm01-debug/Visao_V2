-- ===========================================================================
-- Onda 115 — Auto-healing dos agentes locais
-- Política canônica: src/lib/agentHealing.ts (esta função a espelha).
-- ===========================================================================

-- 1) A fila de relay passa a transportar também os pedidos internos de cura.
ALTER TABLE public.agent_relay_tasks DROP CONSTRAINT IF EXISTS agent_relay_tasks_kind_check;
ALTER TABLE public.agent_relay_tasks ADD CONSTRAINT agent_relay_tasks_kind_check
  CHECK (kind = ANY (ARRAY['http_request'::text, 'self_heal_ping'::text, 'self_heal_restart'::text]));

-- 2) Telemetria das varreduras.
CREATE TABLE IF NOT EXISTS public.agent_healing_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at            timestamptz NOT NULL DEFAULT now(),
  ok                boolean NOT NULL DEFAULT true,
  error_detail      text,
  agents_total      integer NOT NULL DEFAULT 0,
  agents_warning    integer NOT NULL DEFAULT 0,
  agents_critical   integer NOT NULL DEFAULT 0,
  agents_escalated  integer NOT NULL DEFAULT 0,
  actions_enqueued  integer NOT NULL DEFAULT 0,
  duration_ms       integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agent_healing_runs TO authenticated;
GRANT ALL ON public.agent_healing_runs TO service_role;
ALTER TABLE public.agent_healing_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem varreduras de auto-cura"
  ON public.agent_healing_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Servico gerencia varreduras de auto-cura"
  ON public.agent_healing_runs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS agent_healing_runs_ran_at_idx
  ON public.agent_healing_runs (ran_at DESC);

-- 3) Trilha por agente: o que foi tentado, quando e por quê.
CREATE TABLE IF NOT EXISTS public.agent_healing_actions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid REFERENCES public.agent_healing_runs(id) ON DELETE SET NULL,
  agent_id        uuid NOT NULL REFERENCES public.local_agents(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  action          text NOT NULL CHECK (action = ANY (ARRAY['nudge','restart','escalate'])),
  severity        text NOT NULL CHECK (severity = ANY (ARRAY['warning','critical'])),
  reason          text NOT NULL,
  silent_minutes  numeric,
  deaf_ratio      numeric,
  attempts        integer NOT NULL DEFAULT 0,
  task_id         uuid REFERENCES public.agent_relay_tasks(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agent_healing_actions TO authenticated;
GRANT ALL ON public.agent_healing_actions TO service_role;
ALTER TABLE public.agent_healing_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono ve acoes de cura dos seus agentes"
  ON public.agent_healing_actions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Servico gerencia acoes de cura"
  ON public.agent_healing_actions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS agent_healing_actions_agent_idx
  ON public.agent_healing_actions (agent_id, created_at DESC);

-- 4) A rotina de auto-cura.
CREATE OR REPLACE FUNCTION public.heal_local_agents()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  -- Espelham DEFAULT_AGENT_HEALING_THRESHOLDS em src/lib/agentHealing.ts.
  hb_warn_min      constant int := 10;
  hb_crit_min      constant int := 30;
  grace_min        constant int := 15;
  cooldown_min     constant int := 15;
  max_attempts     constant int := 3;
  min_tasks_ratio  constant int := 5;
  deaf_ratio_lim   constant numeric := 0.5;
  cooldown_hours   constant int := 6;   -- dedup do barramento de alertas

  started          timestamptz := clock_timestamp();
  run_id           uuid;
  rec              record;
  silent_min       numeric;
  age_min          numeric;
  ratio            numeric;
  total_tasks      int;
  severity         text;
  reason           text;
  act              text;
  attempts_now     int;
  last_attempt     timestamptz;
  new_task         uuid;
  n_total          int := 0;
  n_warn           int := 0;
  n_crit           int := 0;
  n_esc            int := 0;
  n_enq            int := 0;
BEGIN
  PERFORM set_config('statement_timeout', '30s', true);

  INSERT INTO public.agent_healing_runs DEFAULT VALUES RETURNING id INTO run_id;

  FOR rec IN
    SELECT a.id, a.user_id, a.name, a.status, a.last_seen_at, a.created_at,
           COALESCE(t.done, 0)    AS done,
           COALESCE(t.failed, 0)  AS failed,
           COALESCE(t.expired, 0) AS expired
    FROM public.local_agents a
    LEFT JOIN LATERAL (
      SELECT count(*) FILTER (WHERE r.status = 'done')                       AS done,
             count(*) FILTER (WHERE r.status = 'failed')                     AS failed,
             count(*) FILTER (WHERE r.status = 'expired'
                                 OR (r.status = 'pending' AND r.expires_at < now())) AS expired
      FROM public.agent_relay_tasks r
      WHERE r.agent_id = a.id
        AND r.created_at > now() - interval '1 hour'
        AND r.kind = 'http_request'
    ) t ON true
    WHERE a.status = 'active'
  LOOP
    n_total := n_total + 1;

    -- GREATEST(0, ...) protege contra recuo de relógio (NTP step).
    silent_min := CASE WHEN rec.last_seen_at IS NULL THEN NULL
                       ELSE GREATEST(0, EXTRACT(EPOCH FROM (now() - rec.last_seen_at)) / 60.0) END;
    age_min    := GREATEST(0, EXTRACT(EPOCH FROM (now() - rec.created_at)) / 60.0);

    total_tasks := rec.done + rec.failed + rec.expired;
    ratio := CASE WHEN total_tasks < min_tasks_ratio THEN NULL
                  ELSE (rec.failed + rec.expired)::numeric / total_tasks END;

    -- I2: carência de instalação.
    CONTINUE WHEN rec.last_seen_at IS NULL AND age_min < grace_min;

    severity := NULL; reason := NULL;

    IF rec.last_seen_at IS NULL THEN
      severity := 'critical';
      reason   := 'agente cadastrado nunca bateu heartbeat';
    ELSIF silent_min >= hb_crit_min THEN
      severity := 'critical';
      reason   := format('sem heartbeat há %smin (limite %smin)', round(silent_min, 1), hb_crit_min);
    ELSIF ratio IS NOT NULL AND ratio >= deaf_ratio_lim THEN
      severity := 'critical';
      reason   := format('%s%% das tarefas de relay expiraram/falharam com heartbeat ativo',
                         round(ratio * 100));
    ELSIF silent_min >= hb_warn_min THEN
      severity := 'warning';
      reason   := format('heartbeat atrasado há %smin (limite %smin)', round(silent_min, 1), hb_warn_min);
    ELSIF ratio IS NOT NULL AND ratio > 0 THEN
      severity := 'warning';
      reason   := format('%s%% das tarefas de relay não completaram', round(ratio * 100));
    END IF;

    CONTINUE WHEN severity IS NULL;

    IF severity = 'critical' THEN n_crit := n_crit + 1; ELSE n_warn := n_warn + 1; END IF;

    -- Episódio corrente: tentativas feitas desde o último sinal de vida.
    SELECT count(*), max(created_at)
      INTO attempts_now, last_attempt
    FROM public.agent_healing_actions h
    WHERE h.agent_id = rec.id
      AND h.action IN ('nudge','restart')
      AND h.created_at > COALESCE(rec.last_seen_at, '-infinity'::timestamptz);

    -- I5: tentativas esgotadas ⇒ escalar para humano, sem enfileirar nada.
    IF attempts_now >= max_attempts THEN
      n_esc := n_esc + 1;

      INSERT INTO public.agent_healing_actions
        (run_id, agent_id, user_id, action, severity, reason, silent_minutes, deaf_ratio, attempts)
      VALUES (run_id, rec.id, rec.user_id, 'escalate', 'critical',
              format('%s; %s tentativa(s) de cura sem sucesso', reason, attempts_now),
              round(silent_min, 2), round(ratio, 4), attempts_now);

      IF NOT EXISTS (
        SELECT 1 FROM public.maintenance_alert_events e
        WHERE e.routine = 'local_agent_healing' AND e.severity = 'critical'
          AND e.created_at > now() - make_interval(hours => cooldown_hours)
      ) THEN
        INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
        VALUES ('local_agent_healing', 'critical',
                format('agente local "%s" sem resposta após %s tentativas de auto-cura',
                       rec.name, attempts_now),
                jsonb_build_object('agent_id', rec.id, 'agent_name', rec.name,
                                   'attempts', attempts_now,
                                   'silent_minutes', round(silent_min, 2),
                                   'deaf_ratio', round(ratio, 4)),
                rec.last_seen_at);
      END IF;

      CONTINUE;
    END IF;

    -- I3: cooldown entre tentativas.
    CONTINUE WHEN last_attempt IS NOT NULL
                  AND last_attempt > now() - make_interval(mins => cooldown_min);

    -- I4: a primeira tentativa é sempre o ping barato.
    act := CASE WHEN attempts_now = 0 OR severity = 'warning' THEN 'nudge' ELSE 'restart' END;

    INSERT INTO public.agent_relay_tasks (agent_id, user_id, kind, request, expires_at)
    VALUES (rec.id, rec.user_id,
            CASE WHEN act = 'nudge' THEN 'self_heal_ping' ELSE 'self_heal_restart' END,
            jsonb_build_object('issued_by', 'heal_local_agents', 'reason', reason),
            now() + interval '5 minutes')
    RETURNING id INTO new_task;

    INSERT INTO public.agent_healing_actions
      (run_id, agent_id, user_id, action, severity, reason, silent_minutes, deaf_ratio, attempts, task_id)
    VALUES (run_id, rec.id, rec.user_id, act, severity,
            format('%s; ação: %s', reason, act),
            round(silent_min, 2), round(ratio, 4), attempts_now, new_task);

    n_enq := n_enq + 1;
  END LOOP;

  UPDATE public.agent_healing_runs
     SET agents_total = n_total, agents_warning = n_warn, agents_critical = n_crit,
         agents_escalated = n_esc, actions_enqueued = n_enq,
         duration_ms = GREATEST(0, EXTRACT(MILLISECONDS FROM (clock_timestamp() - started))::int)
   WHERE id = run_id;

  -- Retenção: 90 dias, alinhada a maintenance_alert_events (Onda 110).
  DELETE FROM public.agent_healing_runs WHERE ran_at < now() - interval '90 days';
  DELETE FROM public.agent_healing_actions WHERE created_at < now() - interval '90 days';

  RETURN jsonb_build_object(
    'run_id', run_id, 'agents_total', n_total, 'agents_warning', n_warn,
    'agents_critical', n_crit, 'agents_escalated', n_esc, 'actions_enqueued', n_enq
  );
EXCEPTION WHEN OTHERS THEN
  UPDATE public.agent_healing_runs
     SET ok = false, error_detail = left(SQLERRM, 500),
         duration_ms = GREATEST(0, EXTRACT(MILLISECONDS FROM (clock_timestamp() - started))::int)
   WHERE id = run_id;
  RETURN jsonb_build_object('run_id', run_id, 'ok', false, 'error', SQLERRM);
END;
$function$;

REVOKE ALL ON FUNCTION public.heal_local_agents() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.heal_local_agents() TO service_role;

-- 5) Agendamento: a cada 10 minutos.
SELECT cron.unschedule('heal-local-agents')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'heal-local-agents');

SELECT cron.schedule('heal-local-agents', '*/10 * * * *', 'SELECT public.heal_local_agents();');