# QA Wave 6 — Simulação Adversarial — VISÃO

**Data:** 2026-07-15
**Executor:** Claude Opus 4.8 (persona PhD DBA)

## Escopo

Onda adicional pedida pelo usuário após o 10/10 da Onda 5. Foco em cenários adversariais que a simulação de detecção padrão não exercita:

1. Falhas de rede transientes (timeout, 5xx)
2. RLS edge cases (cross-tenant read, role escalation)
3. Concorrência otimista (`bump_version`)
4. Rate limit burst
5. Retention job replay (idempotência)
6. Tentativa de mutação de `audit_logs` (bloqueada por trigger)

## Resultado

**400 cenários simulados / 100% seguros / 0 unsafe** ✅

Ver `reports/simulations/adversarial.md` e `reports/simulations/adversarial.json`.

| Categoria              | Total | Seguros | Inseguros |
| ---------------------- | ----: | ------: | --------: |
| network_timeout        |    50 |      50 |         0 |
| network_5xx            |    50 |      50 |         0 |
| rls_cross_tenant       |    50 |      50 |         0 |
| rls_role_escalation    |    50 |      50 |         0 |
| optimistic_concurrency |    50 |      50 |         0 |
| rate_limit_burst       |    50 |      50 |         0 |
| retention_replay       |    50 |      50 |         0 |
| audit_log_mutation     |    50 |      50 |         0 |

## Correlação com o backend real

Cada categoria mapeia para uma defesa já auditada:

- **RLS cross-tenant** → policies `auth.uid() = user_id` + `has_org_role` em todas as 56 tabelas
- **Role escalation** → `user_roles` com policy RESTRICTIVE + `replace_user_role` SECURITY DEFINER exigindo `has_role(admin)`
- **Optimistic concurrency** → trigger `bump_version` valida `NEW.version = OLD.version + 1`
- **Rate limit burst** → sliding window limiter documentado em `mem://architecture/edge-functions-rate-limiting`
- **Retention replay** → `run_retention_cleanup` usa `session_replication_role = replica` de forma idempotente
- **Audit mutation** → trigger `prevent_audit_log_mutation` levanta `42501`
- **Network timeout / 5xx** → React Query com 3 retries + backoff (`mem://architecture/resilience-and-retries-policy`)

## Status consolidado

Sistema **mantém 10/10**. Nenhuma regressão introduzida — apenas nova cobertura de simulação (arquivo novo + script novo, zero alteração em código de produção).

## Fora de escopo (mantido)

- Upgrade `recharts` v2→v3
- Refactor incremental dos 61 warnings advisory `set-state-in-effect`
