-- ---------------------------------------------------------------------------
-- Onda 118 — Controle de admissão de reinícios (anti thundering herd).
-- Espelha src/lib/agentRestartBudget.ts. Qualquer mudança de política deve
-- alterar OS DOIS lados; o gate scripts/check-agent-restart-budget.mjs falha
-- quando eles divergem.
-- ---------------------------------------------------------------------------

-- 1) Liberação escalonada da fila: o jitter precisa de um lugar para existir.
--    DEFAULT now() preserva o comportamento atual de todo produtor existente.
ALTER TABLE public.agent_relay_tasks
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz NOT NULL DEFAULT now();

-- Índice alinhado ao novo predicado de claim.
CREATE INDEX IF NOT EXISTS idx_agent_relay_tasks_claimable
  ON public.agent_relay_tasks (agent_id, scheduled_at)
  WHERE status = 'pending';

-- O consumidor passa a respeitar a liberação. `expires_at` continua contando
-- a partir da criação, então uma tarefa jitterada precisa de validade maior —
-- quem enfileira é responsável por isso (a rotina de cura já usa 5 min + jitter).
CREATE OR REPLACE FUNCTION public.claim_agent_relay_tasks(_agent_id uuid, _max integer DEFAULT 4)
 RETURNS SETOF public.agent_relay_tasks
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with picked as (
    select id
      from public.agent_relay_tasks
     where agent_id = _agent_id
       and status = 'pending'
       and expires_at > now()
       and scheduled_at <= now()
     order by created_at
     for update skip locked
     limit greatest(1, least(_max, 16))
  )
  update public.agent_relay_tasks t
     set status = 'in_progress', claimed_at = now()
    from picked
   where t.id = picked.id
  returning t.*;
$function$;

-- 2) Histórico de cura passa a registrar o que NÃO foi feito e por quê.
ALTER TABLE public.agent_healing_actions
  DROP CONSTRAINT IF EXISTS agent_healing_actions_action_check;
ALTER TABLE public.agent_healing_actions
  ADD CONSTRAINT agent_healing_actions_action_check
  CHECK (action IN ('nudge','restart','escalate','defer','suppress'));

ALTER TABLE public.agent_healing_actions
  ADD COLUMN IF NOT EXISTS jitter_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admission_rank integer;

ALTER TABLE public.agent_healing_actions
  DROP CONSTRAINT IF EXISTS agent_healing_actions_jitter_check;
ALTER TABLE public.agent_healing_actions
  ADD CONSTRAINT agent_healing_actions_jitter_check
  CHECK (jitter_seconds >= 0 AND jitter_seconds < 3600);

-- Ações não executadas jamais podem apontar para uma tarefa enfileirada:
-- é essa amarra que impede o painel de dizer "adiado" e a fila conter o pedido.
ALTER TABLE public.agent_healing_actions
  DROP CONSTRAINT IF EXISTS agent_healing_actions_no_task_when_blocked;
ALTER TABLE public.agent_healing_actions
  ADD CONSTRAINT agent_healing_actions_no_task_when_blocked
  CHECK (action NOT IN ('defer','suppress','escalate') OR task_id IS NULL);

-- 3) Telemetria da varredura.
ALTER TABLE public.agent_healing_runs
  ADD COLUMN IF NOT EXISTS restarts_requested integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS restarts_admitted integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS restarts_deferred integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS restarts_suppressed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS effective_budget integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS breaker_tripped boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS breaker_reason text;

-- 4) Hash FNV-1a 32 bits — precisa bater bit a bit com stableHash32() do TS,
--    senão o jitter gravado no banco não seria reproduzível pelo gate de CI.
CREATE OR REPLACE FUNCTION public.stable_hash32(_input text)
 RETURNS bigint
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  h bigint := 2166136261;      -- 0x811c9dc5
  m bigint := 4294967296;      -- 2^32
  i int;
BEGIN
  IF _input IS NULL THEN RETURN 0; END IF;
  FOR i IN 1..length(_input) LOOP
    -- XOR com o byte baixo do caractere (o TS usa charCodeAt & 0xff).
    h := (h # (ascii(substr(_input, i, 1)) & 255));
    -- FNV prime 16777619 = 1 + 2^1 + 2^4 + 2^7 + 2^8 + 2^24
    h := (h * 16777619) % m;
  END LOOP;
  RETURN h;
END;
$function$;

REVOKE ALL ON FUNCTION public.stable_hash32(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stable_hash32(text) TO service_role;

-- 5) Rotina de cura com controle de admissão.
CREATE OR REPLACE FUNCTION public.heal_local_agents()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- Espelham DEFAULT_AGENT_HEALING_THRESHOLDS (Onda 115).
  hb_warn_min      constant int := 10;
  hb_crit_min      constant int := 30;
  grace_min        constant int := 15;
  cooldown_min     constant int := 15;
  max_attempts     constant int := 3;
  min_tasks_ratio  constant int := 5;
  deaf_ratio_lim   constant numeric := 0.5;
  cooldown_hours   constant int := 6;

  -- Espelham DEFAULT_RESTART_BUDGET_POLICY (Onda 118).
  frac_per_run     constant numeric := 0.15;
  min_per_run      constant int := 1;
  max_per_run      constant int := 5;
  window_min       constant int := 60;
  frac_per_window  constant numeric := 0.34;
  max_per_window   constant int := 12;
  breaker_frac     constant numeric := 0.4;
  breaker_min_fleet constant int := 4;
  breaker_min_aff  constant int := 3;
  jitter_spread    constant int := 540;

  started          timestamptz := clock_timestamp();
  run_id           uuid;
  rec              record;
  silent_min       numeric;
  age_min          numeric;
  ratio            numeric;
  total_tasks      int;
  sev              text;
  why              text;
  act              text;
  attempts_now     int;
  last_attempt     timestamptz;
  new_task         uuid;
  jitter_s         int;
  n_total          int := 0;
  n_warn           int := 0;
  n_crit           int := 0;
  n_esc            int := 0;
  n_enq            int := 0;
  fleet_size       int := 0;
  restarts_window  int := 0;
  budget_run       int := 0;
  budget_window    int := 0;
  eff_budget       int := 0;
  n_req            int := 0;
  n_adm            int := 0;
  n_def            int := 0;
  n_sup            int := 0;
  breaker_on       boolean := false;
  breaker_why      text;
  candidates       jsonb := '[]'::jsonb;
  cand             jsonb;
  affected         int := 0;
BEGIN
  PERFORM set_config('statement_timeout', '30s', true);

  INSERT INTO public.agent_healing_runs DEFAULT VALUES RETURNING id INTO run_id;

  SELECT count(*) INTO fleet_size FROM public.local_agents WHERE status = 'active';

  -- FASE 1 — diagnóstico puro. Nada é enfileirado aqui: o disjuntor precisa
  -- enxergar a frota inteira antes que a primeira ação invasiva saia.
  FOR rec IN
    SELECT a.id, a.user_id, a.name, a.last_seen_at, a.created_at,
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

    silent_min := CASE WHEN rec.last_seen_at IS NULL THEN NULL
                       ELSE GREATEST(0, EXTRACT(EPOCH FROM (now() - rec.last_seen_at)) / 60.0) END;
    age_min    := GREATEST(0, EXTRACT(EPOCH FROM (now() - rec.created_at)) / 60.0);

    total_tasks := rec.done + rec.failed + rec.expired;
    ratio := CASE WHEN total_tasks < min_tasks_ratio THEN NULL
                  ELSE (rec.failed + rec.expired)::numeric / total_tasks END;

    CONTINUE WHEN rec.last_seen_at IS NULL AND age_min < grace_min;

    sev := NULL; why := NULL;

    IF rec.last_seen_at IS NULL THEN
      sev := 'critical'; why := 'agente cadastrado nunca bateu heartbeat';
    ELSIF silent_min >= hb_crit_min THEN
      sev := 'critical';
      why := format('sem heartbeat há %smin (limite %smin)', round(silent_min, 1), hb_crit_min);
    ELSIF ratio IS NOT NULL AND ratio >= deaf_ratio_lim THEN
      sev := 'critical';
      why := format('%s%% das tarefas de relay expiraram/falharam com heartbeat ativo', round(ratio * 100));
    ELSIF silent_min >= hb_warn_min THEN
      sev := 'warning';
      why := format('heartbeat atrasado há %smin (limite %smin)', round(silent_min, 1), hb_warn_min);
    ELSIF ratio IS NOT NULL AND ratio > 0 THEN
      sev := 'warning';
      why := format('%s%% das tarefas de relay não completaram', round(ratio * 100));
    END IF;

    CONTINUE WHEN sev IS NULL;

    IF sev = 'critical' THEN n_crit := n_crit + 1; ELSE n_warn := n_warn + 1; END IF;
    affected := affected + 1;

    SELECT count(*), max(created_at)
      INTO attempts_now, last_attempt
    FROM public.agent_healing_actions h
    WHERE h.agent_id = rec.id
      AND h.action IN ('nudge','restart')
      AND h.created_at > COALESCE(rec.last_seen_at, '-infinity'::timestamptz);

    IF attempts_now >= max_attempts THEN
      act := 'escalate';
    ELSIF last_attempt IS NOT NULL AND last_attempt > now() - make_interval(mins => cooldown_min) THEN
      act := 'hold';   -- em cooldown: conta como afetado, mas não vira ação
    ELSIF attempts_now = 0 OR sev = 'warning' THEN
      act := 'nudge';
    ELSE
      act := 'restart';
    END IF;

    candidates := candidates || jsonb_build_object(
      'agent_id', rec.id, 'user_id', rec.user_id, 'name', rec.name,
      'action', act, 'severity', sev, 'reason', why,
      'silent_minutes', round(silent_min, 2), 'deaf_ratio', round(ratio, 4),
      'attempts', attempts_now,
      -- Ordenação determinística idêntica a compareCandidates() no TS.
      'sort_sev', CASE WHEN sev = 'critical' THEN 0 ELSE 1 END,
      'sort_silent', COALESCE(silent_min, 999999)
    );
  END LOOP;

  -- FASE 2 — orçamento e disjuntor.
  SELECT count(*) INTO restarts_window
  FROM public.agent_healing_actions
  WHERE action = 'restart' AND created_at > now() - make_interval(mins => window_min);

  n_req := (SELECT count(*) FROM jsonb_array_elements(candidates) c WHERE c->>'action' = 'restart');

  IF fleet_size > 0 THEN
    budget_run := LEAST(max_per_run, GREATEST(min_per_run, ceil(fleet_size * frac_per_run)::int));
    budget_window := GREATEST(0,
      LEAST(max_per_window, GREATEST(min_per_run, ceil(fleet_size * frac_per_window)::int)) - restarts_window);
  END IF;

  IF fleet_size >= breaker_min_fleet
     AND affected >= breaker_min_aff
     AND affected::numeric / fleet_size >= breaker_frac THEN
    breaker_on := true;
    breaker_why := format(
      '%s de %s agentes (%s%%) adoeceram juntos: causa provável é de ambiente (energia, link, DNS ou backend), não dos agentes',
      affected, fleet_size, round(affected::numeric / fleet_size * 100));
  END IF;

  eff_budget := CASE WHEN breaker_on THEN 0 ELSE LEAST(budget_run, budget_window) END;

  -- FASE 3 — execução, na ordem de prioridade da biblioteca.
  FOR cand IN
    SELECT c FROM jsonb_array_elements(candidates) c
    ORDER BY (c->>'sort_sev')::int,
             (c->>'attempts')::int DESC,
             (c->>'sort_silent')::numeric DESC,
             (c->>'agent_id')
  LOOP
    jitter_s := (public.stable_hash32(cand->>'agent_id') % GREATEST(1, jitter_spread))::int;
    IF jitter_spread = 0 THEN jitter_s := 0; END IF;

    IF cand->>'action' = 'hold' THEN
      CONTINUE;
    END IF;

    IF cand->>'action' = 'escalate' THEN
      n_esc := n_esc + 1;

      INSERT INTO public.agent_healing_actions
        (run_id, agent_id, user_id, action, severity, reason, silent_minutes, deaf_ratio, attempts, jitter_seconds)
      VALUES (run_id, (cand->>'agent_id')::uuid, (cand->>'user_id')::uuid, 'escalate', 'critical',
              format('%s; %s tentativa(s) de cura sem sucesso', cand->>'reason', cand->>'attempts'),
              (cand->>'silent_minutes')::numeric, (cand->>'deaf_ratio')::numeric,
              (cand->>'attempts')::int, jitter_s);

      IF NOT EXISTS (
        SELECT 1 FROM public.maintenance_alert_events e
        WHERE e.routine = 'local_agent_healing' AND e.severity = 'critical'
          AND e.created_at > now() - make_interval(hours => cooldown_hours)
      ) THEN
        INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
        VALUES ('local_agent_healing', 'critical',
                format('agente local "%s" sem resposta após %s tentativas de auto-cura',
                       cand->>'name', cand->>'attempts'),
                jsonb_build_object('agent_id', cand->>'agent_id', 'agent_name', cand->>'name',
                                   'attempts', (cand->>'attempts')::int),
                now());
      END IF;

      CONTINUE;
    END IF;

    -- nudge: diagnóstico barato, nunca bloqueado (I1). Ganha só o jitter.
    IF cand->>'action' = 'nudge' THEN
      INSERT INTO public.agent_relay_tasks (agent_id, user_id, kind, request, scheduled_at, expires_at)
      VALUES ((cand->>'agent_id')::uuid, (cand->>'user_id')::uuid, 'self_heal_ping',
              jsonb_build_object('issued_by', 'heal_local_agents', 'reason', cand->>'reason'),
              now() + make_interval(secs => jitter_s),
              now() + make_interval(secs => jitter_s) + interval '5 minutes')
      RETURNING id INTO new_task;

      INSERT INTO public.agent_healing_actions
        (run_id, agent_id, user_id, action, severity, reason, silent_minutes, deaf_ratio, attempts, task_id, jitter_seconds)
      VALUES (run_id, (cand->>'agent_id')::uuid, (cand->>'user_id')::uuid, 'nudge', cand->>'severity',
              format('%s; ação: nudge', cand->>'reason'),
              (cand->>'silent_minutes')::numeric, (cand->>'deaf_ratio')::numeric,
              (cand->>'attempts')::int, new_task, jitter_s);

      n_enq := n_enq + 1;
      CONTINUE;
    END IF;

    -- restart: única ação que consome orçamento.
    IF breaker_on THEN
      n_sup := n_sup + 1;
      INSERT INTO public.agent_healing_actions
        (run_id, agent_id, user_id, action, severity, reason, silent_minutes, deaf_ratio, attempts, jitter_seconds)
      VALUES (run_id, (cand->>'agent_id')::uuid, (cand->>'user_id')::uuid, 'suppress', cand->>'severity',
              format('reinício suprimido pelo disjuntor de falha correlacionada: %s', breaker_why),
              (cand->>'silent_minutes')::numeric, (cand->>'deaf_ratio')::numeric,
              (cand->>'attempts')::int, jitter_s);
      CONTINUE;
    END IF;

    IF n_adm >= eff_budget THEN
      n_def := n_def + 1;
      INSERT INTO public.agent_healing_actions
        (run_id, agent_id, user_id, action, severity, reason, silent_minutes, deaf_ratio, attempts, jitter_seconds)
      VALUES (run_id, (cand->>'agent_id')::uuid, (cand->>'user_id')::uuid, 'defer', cand->>'severity',
              format('reinício adiado para a próxima varredura: orçamento efetivo %s (frota %s, janela %s)',
                     eff_budget, fleet_size, budget_window),
              (cand->>'silent_minutes')::numeric, (cand->>'deaf_ratio')::numeric,
              (cand->>'attempts')::int, jitter_s);
      CONTINUE;
    END IF;

    INSERT INTO public.agent_relay_tasks (agent_id, user_id, kind, request, scheduled_at, expires_at)
    VALUES ((cand->>'agent_id')::uuid, (cand->>'user_id')::uuid, 'self_heal_restart',
            jsonb_build_object('issued_by', 'heal_local_agents', 'reason', cand->>'reason'),
            now() + make_interval(secs => jitter_s),
            now() + make_interval(secs => jitter_s) + interval '5 minutes')
    RETURNING id INTO new_task;

    INSERT INTO public.agent_healing_actions
      (run_id, agent_id, user_id, action, severity, reason, silent_minutes, deaf_ratio, attempts, task_id, jitter_seconds)
    VALUES (run_id, (cand->>'agent_id')::uuid, (cand->>'user_id')::uuid, 'restart', cand->>'severity',
            format('%s; ação: restart', cand->>'reason'),
            (cand->>'silent_minutes')::numeric, (cand->>'deaf_ratio')::numeric,
            (cand->>'attempts')::int, new_task, jitter_s);

    n_adm := n_adm + 1;
    n_enq := n_enq + 1;
  END LOOP;

  -- FASE 4 — alerta de admissão. Disjuntor é crítico; adiamento é aviso.
  IF breaker_on THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.maintenance_alert_events e
      WHERE e.routine = 'agent_restart_budget' AND e.severity = 'critical'
        AND e.created_at > now() - make_interval(hours => cooldown_hours)
    ) THEN
      INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
      VALUES ('agent_restart_budget', 'critical',
              format('auto-cura suspensa: %s', breaker_why),
              jsonb_build_object('fleet_size', fleet_size, 'affected', affected,
                                 'restarts_suppressed', n_sup, 'run_id', run_id),
              now());
    END IF;
  ELSIF n_def > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.maintenance_alert_events e
      WHERE e.routine = 'agent_restart_budget'
        AND e.created_at > now() - make_interval(hours => cooldown_hours)
    ) THEN
      INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
      VALUES ('agent_restart_budget', 'warning',
              format('%s reinício(s) de agente adiado(s) por limite de orçamento (%s por varredura)',
                     n_def, eff_budget),
              jsonb_build_object('fleet_size', fleet_size, 'restarts_requested', n_req,
                                 'restarts_deferred', n_def, 'run_id', run_id),
              now());
    END IF;
  END IF;

  UPDATE public.agent_healing_runs
     SET agents_total = n_total, agents_warning = n_warn, agents_critical = n_crit,
         agents_escalated = n_esc, actions_enqueued = n_enq,
         restarts_requested = n_req, restarts_admitted = n_adm,
         restarts_deferred = n_def, restarts_suppressed = n_sup,
         effective_budget = eff_budget, breaker_tripped = breaker_on,
         breaker_reason = breaker_why,
         duration_ms = GREATEST(0, EXTRACT(MILLISECONDS FROM (clock_timestamp() - started))::int)
   WHERE id = run_id;

  DELETE FROM public.agent_healing_runs WHERE ran_at < now() - interval '90 days';
  DELETE FROM public.agent_healing_actions WHERE created_at < now() - interval '90 days';

  RETURN jsonb_build_object(
    'run_id', run_id, 'agents_total', n_total, 'agents_warning', n_warn,
    'agents_critical', n_crit, 'agents_escalated', n_esc, 'actions_enqueued', n_enq,
    'restarts_requested', n_req, 'restarts_admitted', n_adm,
    'restarts_deferred', n_def, 'restarts_suppressed', n_sup,
    'effective_budget', eff_budget, 'breaker_tripped', breaker_on
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