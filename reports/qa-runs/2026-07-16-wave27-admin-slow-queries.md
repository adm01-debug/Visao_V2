# Wave 27 — Endpoint admin de queries lentas

## Objetivo

Dar visibilidade das queries mais lentas via `pg_stat_statements` aos admins do sistema para diagnóstico contínuo, sem expor dados sensíveis nem permitir acesso a não-admins.

## Simulação

Script: `scripts/simulate-wave27-scenarios.mjs`
**122 cenários** — 13 casos-limite de clamp do LIMIT + 100 fuzzes aleatórios (garantindo 1..100); matriz de auth 6-roles (anon → 401, authenticated não-admin → 403, admin → 200); rate limit (burst de 15 → 5 negados); filtro de schemas internos (7 linhas sintéticas → 2 mantidas); estabilidade do payload.
Resultado: **0 unsafe / 100% pass**. Artefatos: `reports/simulations/wave27.{json,md}`.

## Backend

**Migração:** função `public.get_slow_queries(_limit int)` — `SECURITY DEFINER`, `search_path=public, extensions`. Guard `has_role(auth.uid(),'admin')` (RAISE 42501). Clamp `1..100`. Filtra `pg_stat_statements` por role de sistema, exclui `<insufficient privilege>` e transações vazias (BEGIN/COMMIT/SET). Ordena por `total_exec_time DESC`. `REVOKE ALL FROM PUBLIC/anon/authenticated` + `GRANT EXECUTE TO service_role`.

**Edge Function:** `supabase/functions/admin-slow-queries/index.ts`

- `verify_jwt = true` (config.toml).
- Cadeia: `Authorization` header → `getUser()` (401 se ausente) → RPC `has_role(admin)` no client do usuário (403 se não-admin) → rate-limit 10/min por `user.id` (429 senão) → chamada `get_slow_queries` via `SUPABASE_SERVICE_ROLE_KEY`.
- CORS + método POST + JSON estável `{ generated_at, limit, rows[] }`.

## Linter

Voltou ao **1 warning pré-existente** (`get_operational_metrics`). O warning temporário introduzido pelo GRANT inicial para `authenticated` foi resolvido em migração de fix-up (`REVOKE EXECUTE FROM authenticated`) — permissão fica apenas com `service_role`, e o edge function faz a checagem de admin antes de invocar.

## Status

Sistema permanece **10/10**.
