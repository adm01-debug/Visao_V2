---
name: Árbitro entre auto-cura e saúde de reentrega (Onda 123)
description: arbitrate_agent_healing + relayHealingArbiter.ts reconciliam a escada de cura (115/118) com a estatística de reentrega (122); ação 'observe' e veto por causa externa; gate db:check:healing-arbiter
type: feature
---

## Problema

Onda 115 (escada nudge→restart→escalate) e Onda 122 (taxa de reentrega por Wilson)
operavam sem se enxergar:

- **G1 — agente meia-boca:** heartbeat pontual e nenhuma tarefa expirada, mas tudo
  só fecha na 2ª/3ª entrega. Invisível para a escada.
- **G2 — reinício cego:** ambiente já diagnosticado como culpado (relógio de câmera,
  saturação de partição, correlação de causa raiz) e a escada mesmo assim derruba
  agentes, cortando streams sem tocar no defeito.

## Solução

`src/lib/relayHealingArbiter.ts` — função pura `arbitrate(facts)`:

| Regra | Condição                                          | Veredito                  |
| ----- | ------------------------------------------------- | ------------------------- |
| R0    | ação = `escalate`                                 | mantém (caso já é humano) |
| R1    | causa externa + ação ≥ `restart`                  | rebaixa para `observe`    |
| R2    | `restart` + entregas > 0 + severidade não crítica | rebaixa para `nudge`      |
| R3    | escada sem ação + reentrega ≠ `none`              | promove para `observe`    |

Severidade final = máximo entre a da escada e a da reentrega.
Nova ação **`observe`**: decisão de NÃO agir que ainda assim vira linha em
`agent_healing_actions` — sem `task_id`, contada em `agent_healing_runs.agents_observed`.

## SQL

- `public.arbitrate_agent_healing(action, severity, redelivery_severity, deliveries, external_root_cause)`
  → `jsonb {action, severity, overridden, reason}`. `IMMUTABLE`, `SECURITY DEFINER`,
  `service_role` apenas.
- `heal_local_agents()` coleta o último evento `relay_redelivery` do agente (6h) e a
  evidência de causa externa (`root_cause_correlation`, `partition_backlog_trend`,
  `camera_clock_skew`, críticos nas últimas 2h) antes de decidir.
- `hold` (cooldown) fica fora do árbitro — é estado, não ação.

## Gate

`npm run db:check:healing-arbiter` (`scripts/check-healing-arbiter.mjs`, dentro de
`db:check:all`): 288 combinações comparando SQL↔TS em uma única query `VALUES`,
mais 4 invariantes estruturais (constraint aceita `observe`, `observe` nunca com
`task_id`, função não exposta a anon/authenticated, coluna `agents_observed`).
Carrega o TS transpilando com o esbuild do Vite — nunca contra uma cópia.

## Limite conhecido

O laço de `heal_local_agents` não pôde ser exercitado com dados sintéticos: `local_agents.user_id`
referencia `auth.users` e o ambiente não tem usuários nem permissão no schema `auth`.
A cobertura vem da paridade exaustiva do árbitro + testes unitários do TS.
