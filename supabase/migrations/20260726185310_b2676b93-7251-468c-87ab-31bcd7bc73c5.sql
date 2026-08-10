-- Onda 123 — árbitro entre a escada de cura (115/118) e a saúde de reentrega (122).

ALTER TABLE public.agent_healing_runs
  ADD COLUMN IF NOT EXISTS agents_observed integer NOT NULL DEFAULT 0;

ALTER TABLE public.agent_healing_actions
  DROP CONSTRAINT IF EXISTS agent_healing_actions_action_check;
ALTER TABLE public.agent_healing_actions
  ADD CONSTRAINT agent_healing_actions_action_check
  CHECK (action = ANY (ARRAY['nudge','restart','escalate','defer','suppress','observe']));

ALTER TABLE public.agent_healing_actions
  DROP CONSTRAINT IF EXISTS agent_healing_actions_no_task_when_blocked;
ALTER TABLE public.agent_healing_actions
  ADD CONSTRAINT agent_healing_actions_no_task_when_blocked
  CHECK ((action <> ALL (ARRAY['defer','suppress','escalate','observe'])) OR task_id IS NULL);

-- Espelha src/lib/relayHealingArbiter.ts. Função pura: nenhum acesso a tabela,
-- nenhum relógio — o gate de CI compara as duas pontas ponto a ponto.
CREATE OR REPLACE FUNCTION public.arbitrate_agent_healing(
  healing_action text,
  healing_severity text,
  redelivery_severity text,
  deliveries integer,
  external_root_cause boolean
) RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  inv        constant jsonb := '{"none":0,"observe":1,"nudge":2,"restart":3,"escalate":4}'::jsonb;
  sev_rank   constant jsonb := '{"ok":0,"warning":1,"critical":2}'::jsonb;
  red_rank   constant jsonb := '{"none":0,"warning":1,"critical":2}'::jsonb;
  d          int := GREATEST(0, COALESCE(deliveries, 0));
  rr         int := COALESCE((red_rank->>COALESCE(redelivery_severity,'none'))::int, 0);
  hs         int := COALESCE((sev_rank->>COALESCE(healing_severity,'ok'))::int, 0);
  sev        text;
  ext        boolean := COALESCE(external_root_cause, false);
BEGIN
  sev := CASE WHEN hs >= rr THEN healing_severity
              WHEN rr = 2 THEN 'critical'
              ELSE 'warning' END;

  -- R0 — escalar é fato consumado da escada.
  IF healing_action = 'escalate' THEN
    RETURN jsonb_build_object('action','escalate','severity',sev,'overridden',false,
      'reason','tentativas de cura esgotadas pela escada; caso é humano');
  END IF;

  -- R1 — causa raiz externa veta qualquer ação invasiva.
  IF ext THEN
    IF COALESCE((inv->>healing_action)::int, 0) >= 3 THEN
      RETURN jsonb_build_object('action','observe','severity',sev,'overridden',true,
        'reason','causa raiz externa atribuída a este episódio: reinício derrubaria streams sem tocar no defeito real');
    END IF;
    IF healing_action = 'none' AND rr > 0 THEN
      RETURN jsonb_build_object('action','observe','severity',sev,'overridden',true,
        'reason','reentrega acima do esperado, porém já explicada por causa raiz externa');
    END IF;
    RETURN jsonb_build_object('action',healing_action,'severity',sev,'overridden',false,
      'reason','ação não invasiva mantida sob causa raiz externa');
  END IF;

  -- R2 — prova de vida rebaixa reinício de severidade apenas de aviso.
  IF healing_action = 'restart' AND d > 0 AND sev <> 'critical' THEN
    RETURN jsonb_build_object('action','nudge','severity',sev,'overridden',true,
      'reason', format('agente concluiu %s entrega(s) na janela: prova de vida rebaixa o reinício a sondagem', d));
  END IF;

  -- R3 — agente invisível à escada, denunciado pela estatística de reentrega.
  IF healing_action = 'none' AND rr > 0 THEN
    RETURN jsonb_build_object('action','observe','severity',sev,'overridden',true,
      'reason', CASE WHEN redelivery_severity = 'critical'
        THEN 'heartbeat saudável, mas a fila só fecha por reentrega: degradação real fora do alcance da escada'
        ELSE 'heartbeat saudável com reentrega acima do esperado: episódio registrado para acompanhamento' END);
  END IF;

  RETURN jsonb_build_object('action',healing_action,'severity',sev,'overridden',false,
    'reason','decisão da escada de cura mantida');
END;
$function$;

REVOKE ALL ON FUNCTION public.arbitrate_agent_healing(text,text,text,integer,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.arbitrate_agent_healing(text,text,text,integer,boolean) TO service_role;

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
  -- Onda 123 — árbitro entre a escada de cura e a saúde de reentrega.
  redeliv_sev      text;
  ext_cause        boolean := false;
  ext_why          text;
  arb              jsonb;
  n_obs            int := 0;
  only_redeliv     boolean := false;
BEGIN
  PERFORM set_config('statement_timeout', '30s', true);

  INSERT INTO public.agent_healing_runs DEFAULT VALUES RETURNING id INTO run_id;

  SELECT count(*) INTO fleet_size FROM public.local_agents WHERE status = 'active';

  -- Onda 123 — evidência de causa raiz EXTERNA em curso. Quando o ambiente
  -- (relógio de câmera, saturação de partição, correlação de causa raiz) já
  -- explica a degradação, reiniciar agentes troca um incidente diagnosticado
  -- por uma frota derrubada.
  SELECT true, format('alerta crítico de ambiente em aberto: %s', e.routine)
    INTO ext_cause, ext_why
    FROM public.maintenance_alert_events e
   WHERE e.severity = 'critical'
     AND e.routine IN ('root_cause_correlation', 'partition_backlog_trend', 'camera_clock_skew')
     AND e.created_at > now() - interval '2 hours'
   ORDER BY e.created_at DESC
   LIMIT 1;
  ext_cause := COALESCE(ext_cause, false);

  -- FASE 1 — diagnóstico puro. Nada é enfileirado aqui: o disjuntor precisa
  -- enxergar a frota inteira antes que a primeira ação invasiva saia.
  FOR rec IN
    SELECT a.id, a.user_id, a.name, a.last_seen_at, a.created_at,
           COALESCE(t.done, 0)    AS done,
           COALESCE(t.failed, 0)  AS failed,
           COALESCE(t.expired, 0) AS expired
    FROM public.local_agents a
    LEFT JOIN LATERAL (
      -- Onda 120: `done` e `failed` sao ambos PROVA DE VIDA.
      SELECT count(*) FILTER (WHERE r.status IN ('done', 'failed')
                                AND COALESCE(r.error, '') NOT IN ('backend_timeout', 'relay_backend_abandoned')) AS done,
             0                                                               AS failed,
             count(*) FILTER (WHERE (r.status = 'expired'
                                     OR (r.status = 'pending' AND r.expires_at < now()))
                                AND (r.expires_at - r.scheduled_at) >= interval '60 seconds'
                                AND COALESCE(r.error, '') NOT IN ('task_expired_unfair_window',
                                                                  'backend_timeout',
                                                                  'relay_backend_abandoned',
                                                                  'task_expired_deadline')) AS expired
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
      why := format('%s%% das tarefas de relay com janela justa ficaram sem resposta do agente', round(ratio * 100));
    ELSIF silent_min >= hb_warn_min THEN
      sev := 'warning';
      why := format('heartbeat atrasado há %smin (limite %smin)', round(silent_min, 1), hb_warn_min);
    ELSIF ratio IS NOT NULL AND ratio > 0 THEN
      sev := 'warning';
      why := format('%s%% das tarefas de relay ficaram sem resposta do agente', round(ratio * 100));
    END IF;

    -- Onda 123 — sinal independente de reentrega (Onda 122) para este agente.
    SELECT e.severity INTO redeliv_sev
      FROM public.maintenance_alert_events e
     WHERE e.routine = 'relay_redelivery'
       AND e.detail->>'agent_id' = rec.id::text
       AND e.created_at > now() - interval '6 hours'
     ORDER BY e.created_at DESC
     LIMIT 1;
    redeliv_sev := COALESCE(redeliv_sev, 'none');

    -- G1 — agente que bate heartbeat e responde tudo, mas só na reentrega:
    -- invisível para a escada, denunciado pela estatística.
    only_redeliv := false;
    IF sev IS NULL AND redeliv_sev <> 'none' THEN
      only_redeliv := true;
      sev := CASE WHEN redeliv_sev = 'critical' THEN 'critical' ELSE 'warning' END;
      why := 'heartbeat saudável, mas a fila só fecha por reentrega (saúde de reentrega da Onda 122)';
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

    IF only_redeliv THEN act := 'none'; END IF;

    -- 'hold' é estado de cooldown, não ação da escada: fica fora do árbitro.
    IF act <> 'hold' THEN
      arb := public.arbitrate_agent_healing(act, sev, redeliv_sev, rec.done, ext_cause);
      IF (arb->>'overridden')::boolean THEN
        act := arb->>'action';
        why := format('%s [árbitro: %s%s]', why, arb->>'reason',
                      CASE WHEN ext_cause THEN '; ' || ext_why ELSE '' END);
      END IF;
      sev := arb->>'severity';
    END IF;

    candidates := candidates || jsonb_build_object(
      'agent_id', rec.id, 'user_id', rec.user_id, 'name', rec.name,
      'action', act, 'severity', sev, 'reason', why,
      'silent_minutes', round(silent_min, 2), 'deaf_ratio', round(ratio, 4),
      'attempts', attempts_now,
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

    IF cand->>'action' IN ('hold', 'none') THEN
      CONTINUE;
    END IF;

    -- Onda 123 — decisão de NÃO agir também deixa rastro auditável.
    IF cand->>'action' = 'observe' THEN
      n_obs := n_obs + 1;
      INSERT INTO public.agent_healing_actions
        (run_id, agent_id, user_id, action, severity, reason, silent_minutes, deaf_ratio, attempts, jitter_seconds)
      VALUES (run_id, (cand->>'agent_id')::uuid, (cand->>'user_id')::uuid, 'observe', cand->>'severity',
              cand->>'reason',
              (cand->>'silent_minutes')::numeric, (cand->>'deaf_ratio')::numeric,
              (cand->>'attempts')::int, jitter_s);
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
         agents_observed = n_obs,
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
    'effective_budget', eff_budget, 'breaker_tripped', breaker_on,
    'agents_observed', n_obs
  );
EXCEPTION WHEN OTHERS THEN
  UPDATE public.agent_healing_runs
     SET ok = false, error_detail = left(SQLERRM, 500),
         duration_ms = GREATEST(0, EXTRACT(MILLISECONDS FROM (clock_timestamp() - started))::int)
   WHERE id = run_id;
  RETURN jsonb_build_object('run_id', run_id, 'ok', false, 'error', SQLERRM);
END;
$function$;