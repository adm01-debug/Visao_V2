---
name: Guardrails de banco no CI (definer + RLS + partições + DBA)
description: Job db-guardrails no pr-test-suite.yml roda npm run db:check:all (SECURITY DEFINER + RLS permissiva + partições sem RLS + privilégios DBA) e bloqueia o merge
type: feature
---

## Gates

- `npm run db:check:definer` — `scripts/check-definer-exposure.mjs` (exposição a anon / falta de guard).
- `npm run db:check:rls` — `scripts/check-rls-exposure.mjs`:
  - política RLS irrestrita (`USING (true)` / `WITH CHECK (true)`) fora de `service_role`;
  - política ainda ligada a `PUBLIC`/`anon` (exceto deny-all com `USING false`, intencional em `edge_cache` e `idempotency_keys`);
  - rotina DBA (`terminate_db_session`, `get_permissive_rls_policies`, `get_db_health_snapshot`, `get_slow_queries`) executável por `authenticated` sem guard `has_role(..., 'admin')`;
  - **(Onda 106)** partição do schema `public` sem `relrowsecurity` ou sem policy própria.
- `npm run db:check:dba` — `scripts/check-dba-privileges.mjs` executa `tests/rls/dba-privileges.sql`
  (transação com ROLLBACK, sem pgTAP): anon bloqueado em toda rotina DBA, guard de admin
  presente, `SET search_path` em toda SECURITY DEFINER, rotinas internas
  (`capture_db_health_snapshot`, `close_expired_test_sessions`, `system_health`,
  `ensure_future_partitions`) exclusivas de `service_role`.
- `npm run db:check:all` roda os três.

Todos aceitam `SUPABASE_DB_URL`/`DATABASE_URL`; sem isso usam as variáveis `PG*` do ambiente.

## Regra de partições (Onda 106)

A RLS do pai só é aplicada quando a query passa pela tabela particionada. `SELECT ... FROM
public.<partição>` usa exclusivamente a RLS **da partição**. Por isso
`public.ensure_future_partitions(months_ahead)` agora, para cada partição criada:

1. `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` + `GRANT ALL ... TO service_role`
   (nunca `anon`);
2. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`;
3. `CREATE POLICY <part>_user_isolation ... FOR ALL TO authenticated USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)` — protegida por checagem em `pg_policies` (CREATE POLICY
   não é idempotente, dispara 42710).

A função é `SECURITY DEFINER`, `SET search_path = public` e executável apenas por `service_role`.
Reconvergir com `SELECT public.ensure_future_partitions(6);`.

## CI

Job `db-guardrails` no `.github/workflows/pr-test-suite.yml`: instala `postgresql-client`, pula com warning se o secret `SUPABASE_DB_URL` não existir (forks) e entra no `suite-gate` — `failure`/`cancelled` bloqueiam o merge.

## Estado atual (Onda 106)

Zero políticas ligadas a `PUBLIC` no schema public — todas usam `TO authenticated`.
`terminate_db_session` é admin-only por guard interno (operador/viewer recebem `42501`).
Todas as partições de `recognition_logs` e `plate_detections` (incluindo as de 2027-01) têm
RLS habilitada + policy de isolamento por `user_id`.
Simulação `scripts/simulate-wave106-scenarios.mjs`: 1152 cenários, 80 inseguros — todos
exclusivamente em estados `rls_off`, eliminados pela migração.
