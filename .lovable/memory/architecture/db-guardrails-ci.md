---
name: Guardrails de banco no CI (definer + RLS)
description: Job db-guardrails no pr-test-suite.yml roda npm run db:check:all (SECURITY DEFINER + RLS permissiva + rotinas DBA) e bloqueia o merge
type: feature
---

## Gates

- `npm run db:check:definer` — `scripts/check-definer-exposure.mjs` (exposição a anon / falta de guard).
- `npm run db:check:rls` — `scripts/check-rls-exposure.mjs`:
  - política RLS irrestrita (`USING (true)` / `WITH CHECK (true)`) fora de `service_role`;
  - política ainda ligada a `PUBLIC`/`anon` (exceto deny-all com `USING false`, intencional em `edge_cache` e `idempotency_keys`);
  - rotina DBA (`terminate_db_session`, `get_permissive_rls_policies`, `get_db_health_snapshot`, `get_slow_queries`) executável por `authenticated` sem guard `has_role(..., 'admin')`.
- `npm run db:check:all` roda os dois.

Ambos aceitam `SUPABASE_DB_URL`/`DATABASE_URL`; sem isso usam as variáveis `PG*` do ambiente.

## CI

Job `db-guardrails` no `.github/workflows/pr-test-suite.yml`: instala `postgresql-client`, pula com warning se o secret `SUPABASE_DB_URL` não existir (forks) e entra no `suite-gate` — `failure`/`cancelled` bloqueiam o merge.

## Estado atual (Onda 105)

Zero políticas ligadas a `PUBLIC` no schema public — todas usam `TO authenticated`. `terminate_db_session` é admin-only por guard interno (operador/viewer recebem `42501`).
