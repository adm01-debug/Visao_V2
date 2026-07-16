# Wave 26 — Manutenção mensal de índices e estatísticas

## Objetivo
Automatizar `SET STATISTICS` + `ANALYZE` + `REINDEX` seletivo mensal para manter os planos do Postgres precisos e evitar bloat nos índices críticos, sem impacto em horário comercial.

## Simulação
Script: `scripts/simulate-wave26-scenarios.mjs`
**134 cenários** — exclusão de parents particionados (recognition_logs, plate_detections) do REINDEX; horário off-peak (04:30 UTC dia 1); isolamento de falhas em 100 execuções; modelo de locks garantindo que tabelas hot-write não são reindexadas; limites do statistics target; idempotência (20 reruns).
Resultado: **0 unsafe / 100% pass**. Artefatos: `reports/simulations/wave26.{json,md}`.

## Backend
**Migração:** `public.run_index_maintenance()` (`SECURITY DEFINER`, `search_path=public`):
- `ALTER TABLE … SET STATISTICS 500` nas colunas quentes (`query_telemetry.operation`, `created_at`; `audit_logs.created_at`; `edge_cache.expires_at`).
- `ANALYZE` em 7 tabelas críticas com **failure isolation** por `BEGIN…EXCEPTION` (uma tabela falhando não aborta as demais).
- `REINDEX INDEX` apenas nos índices parciais pequenos (`idx_query_telemetry_circuit_recent`, `idx_query_telemetry_edge_cache_recent`) — **nunca em parents particionados** ou em tabelas de alto write.
- Guard `has_role(auth.uid(),'admin')` para chamadas ad-hoc via API; cron owner (postgres) passa via `SECURITY DEFINER`.
- `REVOKE ALL FROM PUBLIC/anon/authenticated` + `GRANT EXECUTE TO service_role` — invisível ao PostgREST público.
- Retorna JSON com `ran_at` + trilha `results[]` de cada passo.

**Cron:** `visao-monthly-index-maintenance`, schedule `30 4 1 * *` (dia 1, 04:30 UTC), agendado via `cron.schedule` — visível em `get_operational_metrics()`.

## Linter
1 warning **pré-existente** (`get_operational_metrics`, já defendido internamente por `has_role`). Nenhum warning introduzido — `run_index_maintenance()` já tem `REVOKE ALL` e `GRANT EXECUTE TO service_role` na mesma migração.

## Status
Sistema permanece **10/10**.
