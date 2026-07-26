-- ============================================================================
-- Onda 141 — Exercício do laço completo de `heal_local_agents()` em CI.
--
-- REGRA DE OURO: este arquivo NÃO CONTÉM `COMMIT`. Tudo roda dentro de uma
-- única transação encerrada por `ROLLBACK`. É isso que torna o exercício
-- seguro: `heal_local_agents()` varre a frota INTEIRA (inclusive agentes
-- reais), enfileira tarefas de relay e abre alertas de manutenção. Sem o
-- rollback, um "teste" reiniciaria agentes de produção.
--
-- O script `scripts/exercise-healing-loop.mjs` recusa-se a executar este
-- arquivo se encontrar um `COMMIT` nele — a garantia não depende de disciplina
-- humana.
--
-- Requer:
--   -v uid=<uuid do usuário de CI dedicado>   (scripts/seed-healing-ci-user.mjs)
--   -v ON_ERROR_STOP=1
--
-- Saída: linhas `RESULT|<passe>|<cenário>|<ação>|<severidade>|<motivo>` e
--        `RUN|<passe>|<json do resumo da varredura>`.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

SET LOCAL statement_timeout = '120s';
-- Um exercício travado é pior que um exercício falho: ele segura locks sobre
-- tabelas de produção. Prazo curto e explícito.
SET LOCAL lock_timeout = '10s';
SET LOCAL idle_in_transaction_session_timeout = '120s';

-- ---------------------------------------------------------------------------
-- 0) Pré-condição: o usuário dedicado precisa existir. Sem ele, os fixtures
--    cairiam sob outro dono e o rastro ficaria indistinguível de dado real.
--    A verificação é feita pelo `scripts/exercise-healing-loop.mjs` via Admin
--    API — o papel de banco usado em CI não enxerga o schema `auth`, e ler
--    `auth.users` aqui abortaria o exercício por falta de privilégio, não por
--    falha real. Deixamos a garantia onde ela pode, de fato, ser aplicada.
-- ---------------------------------------------------------------------------


CREATE TEMP TABLE ci_result (
  pass      int  NOT NULL,
  scenario  text NOT NULL,
  agent_id  uuid NOT NULL,
  action    text,
  severity  text,
  reason    text
) ON COMMIT DROP;

CREATE TEMP TABLE ci_run (
  pass    int  NOT NULL,
  summary jsonb NOT NULL
) ON COMMIT DROP;

-- ---------------------------------------------------------------------------
-- 1) Fixtures. UUIDs fixos para que a asserção seja por identidade, não por
--    ordem de linha. Nomes prefixados com `ci-healing-` para que qualquer
--    resíduo (impossível sob rollback, mas defesa em profundidade) seja
--    reconhecível a olho nu.
-- ---------------------------------------------------------------------------
INSERT INTO public.local_agents (id, user_id, name, token_hash, status, last_seen_at, created_at)
VALUES
  -- S1: recém-cadastrado, nunca bateu heartbeat, ainda dentro da carência de
  -- 15min ⇒ a rotina DEVE ignorá-lo. Agente que acabou de nascer não é doente.
  ('c1000000-0000-4000-8000-000000000001', :'uid'::uuid, 'ci-healing-grace',
   'ci-healing-token-01', 'active', NULL, now() - interval '2 minutes'),

  -- S2: heartbeat atrasado 12min (≥10, <30) ⇒ warning ⇒ nudge.
  ('c1000000-0000-4000-8000-000000000002', :'uid'::uuid, 'ci-healing-nudge',
   'ci-healing-token-02', 'active', now() - interval '12 minutes', now() - interval '30 days'),

  -- S3: silencioso 45min ⇒ critical; já houve 1 nudge fora do cooldown ⇒ restart.
  ('c1000000-0000-4000-8000-000000000003', :'uid'::uuid, 'ci-healing-restart',
   'ci-healing-token-03', 'active', now() - interval '45 minutes', now() - interval '30 days'),

  -- S4: silencioso 60min com 3 tentativas gastas ⇒ escalate (caso humano).
  ('c1000000-0000-4000-8000-000000000004', :'uid'::uuid, 'ci-healing-escalate',
   'ci-healing-token-04', 'active', now() - interval '60 minutes', now() - interval '30 days'),

  -- S5: heartbeat perfeito, mas com alerta de reentrega ⇒ invisível à escada,
  -- capturado pelo árbitro (R3) como `observe`.
  ('c1000000-0000-4000-8000-000000000005', :'uid'::uuid, 'ci-healing-observe',
   'ci-healing-token-05', 'active', now() - interval '1 minute', now() - interval '30 days');

-- S6 (gêmeo de S3, para o veto do passe 2) NÃO entra aqui de propósito: se
-- existisse durante o passe 1, seria reiniciado ali e, no passe 2, o cooldown
-- de 15min o silenciaria — o exercício mediria o cooldown achando que mede o
-- veto. Ele é criado só na seção 3.


-- Enchimento saudável: sem ele, os 5 agentes doentes seriam a frota inteira e o
-- disjuntor de falha correlacionada (≥40% afetados) abortaria o passe 1 — o
-- exercício mediria o disjuntor em vez da escada.
INSERT INTO public.local_agents (id, user_id, name, token_hash, status, last_seen_at, created_at)
SELECT ('c1000000-0000-4000-8000-0000000001' || lpad(i::text, 2, '0'))::uuid,
       :'uid'::uuid, 'ci-healing-healthy-' || i, 'ci-healing-token-h' || i,
       'active', now() - interval '30 seconds', now() - interval '30 days'
FROM generate_series(1, 12) AS i;

-- Alerta de reentrega que sustenta S5 (Onda 122 → árbitro da Onda 123).
INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
VALUES ('relay_redelivery', 'warning', 'exercício de CI: reentrega acima do esperado',
        jsonb_build_object('agent_id', 'c1000000-0000-4000-8000-000000000005'), now() - interval '5 minutes');

-- Histórico de tentativas: define em que degrau da escada cada agente entra.
INSERT INTO public.agent_healing_actions
  (agent_id, user_id, action, severity, reason, attempts, created_at)
VALUES
  ('c1000000-0000-4000-8000-000000000003', :'uid'::uuid, 'nudge', 'critical',
   'fixture de CI: tentativa anterior fora do cooldown', 1, now() - interval '20 minutes'),
  ('c1000000-0000-4000-8000-000000000004', :'uid'::uuid, 'nudge', 'critical',
   'fixture de CI: tentativa 1', 1, now() - interval '50 minutes'),
  ('c1000000-0000-4000-8000-000000000004', :'uid'::uuid, 'restart', 'critical',
   'fixture de CI: tentativa 2', 2, now() - interval '40 minutes'),
  ('c1000000-0000-4000-8000-000000000004', :'uid'::uuid, 'restart', 'critical',
   'fixture de CI: tentativa 3', 3, now() - interval '20 minutes');

-- ---------------------------------------------------------------------------
-- 2) PASSE 1 — escada sem causa raiz externa.
--
--    `ci_seen` congela as ações pré-existentes. Filtrar por janela de tempo
--    (`created_at >= now() - 10s`) NÃO funcionaria: dentro de uma transação
--    `now()` é o instante de abertura, então as ações dos dois passes caem na
--    mesma janela e o passe 2 leria a decisão do passe 1.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE ci_seen ON COMMIT DROP AS
SELECT id FROM public.agent_healing_actions;

DO $$
DECLARE
  summary jsonb;
BEGIN
  summary := public.heal_local_agents();
  INSERT INTO ci_run (pass, summary) VALUES (1, summary);
END $$;

INSERT INTO ci_result (pass, scenario, agent_id, action, severity, reason)
SELECT 1, a.name, a.id, h.action, h.severity, h.reason
FROM public.local_agents a
LEFT JOIN LATERAL (
  SELECT x.action, x.severity, x.reason
  FROM public.agent_healing_actions x
  WHERE x.agent_id = a.id
    AND NOT EXISTS (SELECT 1 FROM ci_seen s WHERE s.id = x.id)
  ORDER BY x.created_at DESC
  LIMIT 1
) h ON true
WHERE a.id IN (
  'c1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002',
  'c1000000-0000-4000-8000-000000000003','c1000000-0000-4000-8000-000000000004',
  'c1000000-0000-4000-8000-000000000005'
);

-- ---------------------------------------------------------------------------
-- 3) PASSE 2 — mesma frota, agora com causa raiz externa crítica em aberto.
--    A causa externa é GLOBAL: por isso o passe 2 usa S6 (gêmeo intocado de
--    S3), e não S3, que já gastou tentativa e entraria em cooldown.
-- ---------------------------------------------------------------------------
INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
VALUES ('root_cause_correlation', 'critical',
        'exercício de CI: causa raiz externa em aberto',
        jsonb_build_object('source', 'ci-healing-loop'), now() - interval '1 minute');

DO $$
DECLARE
  summary jsonb;
BEGIN
  summary := public.heal_local_agents();
  INSERT INTO ci_run (pass, summary) VALUES (2, summary);
END $$;

INSERT INTO ci_result (pass, scenario, agent_id, action, severity, reason)
SELECT 2, a.name, a.id, h.action, h.severity, h.reason
FROM public.local_agents a
LEFT JOIN LATERAL (
  SELECT x.action, x.severity, x.reason
  FROM public.agent_healing_actions x
  WHERE x.agent_id = a.id AND x.created_at >= now() - interval '10 seconds'
  ORDER BY x.created_at DESC
  LIMIT 1
) h ON true
WHERE a.id = 'c1000000-0000-4000-8000-000000000006';

-- ---------------------------------------------------------------------------
-- 4) Saída legível por máquina. O julgamento fica no Node — SQL reporta fatos.
-- ---------------------------------------------------------------------------
\pset tuples_only on
\pset format unaligned
\pset fieldsep '|'

SELECT 'RESULT', pass, scenario, COALESCE(action, 'none'), COALESCE(severity, ''), COALESCE(reason, '')
FROM ci_result ORDER BY pass, scenario;

SELECT 'RUN', pass, summary::text FROM ci_run ORDER BY pass;

-- Prova de que a fila recebeu tarefa real de cura no passe 1.
SELECT 'TASK', t.kind, count(*)::text
FROM public.agent_relay_tasks t
WHERE t.user_id = :'uid'::uuid AND t.kind IN ('self_heal_ping', 'self_heal_restart')
GROUP BY t.kind ORDER BY t.kind;

-- Prova de que o escalonamento chegou ao barramento de manutenção.
SELECT 'ALERT', count(*)::text
FROM public.maintenance_alert_events
WHERE routine = 'local_agent_healing' AND created_at >= now() - interval '2 minutes';

-- ---------------------------------------------------------------------------
-- 5) Descarte total. Nada do que foi feito acima sobrevive a esta linha.
-- ---------------------------------------------------------------------------
ROLLBACK;
