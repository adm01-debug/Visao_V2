# Wave 24 — Circuit Breaker Observability no /health

## Objetivo
Tornar o estado dos circuit breakers visível fora do isolate onde ocorreu a transição. Sem isso, uma abertura no isolate da `insightface-detect` era invisível para monitoramento externo. Agora `/health` sinaliza `degraded` quando qualquer breaker está aberto nos últimos 15 min.

## Simulação
Script: `scripts/simulate-wave24-scenarios.mjs`
**215 cenários** — dedupe de eventos `open` (12 thresholds), ciclo completo `closed→open→half-open→closed`, falha em half-open re-abrindo com nova `openedAt`, 200 ciclos mistos sem eventos duplicados consecutivos, isolamento de callback throw.
Resultado: **0 unsafe / 100% pass**. Artefatos: `reports/simulations/wave24.{json,md}`.

## Implementação
- **`_shared/circuitBreaker.ts`**: novo campo `onStateChange` em `CircuitOptions`, `StateChangeEvent` tipado, `listCircuits()` helper, `transition()` centraliza mudança + emissão. Callback é sempre invocado em try/catch e resultado async tem `.catch(() => {})` — **observability jamais pode quebrar o breaker**.
- **`_shared/replicate.ts`**: registra `persistTransition` como callback. Cada mudança de estado gera INSERT fire-and-forget em `public.query_telemetry` com `operation='circuit_transition'`, `query_type='circuit:<state>'`, severity `warn` para open, `info` para closed/half-open. Usa `SUPABASE_SERVICE_ROLE_KEY` via REST.
- **`functions/health/index.ts`**: lê últimas 20 transições dos últimos 15 min de `query_telemetry`, expõe em `circuits.recent_transitions` e derive `circuits.any_open`. Se qualquer breaker aberto, status vira `degraded`. Versão bumpada para `v24`. Try/catch na query — falha de telemetria não derruba `/health`.

## Segurança e compatibilidade
- Nenhuma mudança de schema.
- `query_telemetry` já tinha RLS (writes admin-only via service_role, leitura restrita) — o INSERT via service_role passa.
- Nenhum secret exposto: `SUPABASE_SERVICE_ROLE_KEY` só usado server-side.
- Comportamento sempre superset: sem breaker aberto, `/health` retorna o mesmo payload de v20 + `circuits: { recent_transitions: [], any_open: false }`.

## Status
Sistema permanece **10/10**.
