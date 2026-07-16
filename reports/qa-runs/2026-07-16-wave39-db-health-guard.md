# Onda 39 — DB Health Guard + snapshot baseline

**Data:** 2026-07-16
**Status:** ✅ 10/10 mantido

## Snapshot atual (MCP `db_health`)
- Database: up | PgBouncer: up | Restarts: 0
- Memória: 53% | Disco: 16% | Conexões: 9/60 | Pool: 1/200
- WAL: 112 MB | Rollbacks (boot): 549 | DB size: 16.2 MB

**Avaliação:** dentro do baseline em todos os indicadores. Rollbacks acumulados
desde boot (549) são compatíveis com uso normal — Postgres marca como
rolled-back qualquer `SELECT` que aborte por RLS/deadlock/timeout.

## Implementação
- `src/lib/dbHealthGuard.ts` — função pura `evaluateHealth(snapshot)`
  retorna `{ level, metric, message }[]` com thresholds explícitos
  (mem 70/85, disk 70/85, conn 70/90%, pool 70/90%, WAL 512/1024 MB).
- Sem estado, sem I/O — testável 100%.
- Uso: CI pode capturar snapshot via MCP e falhar quando qualquer alerta
  for `critical`.

## Testes
- Unit `dbHealthGuard.test.ts`: **6/6 pass**.
- Simulação `wave39`: **401/401 pass** (snapshot real + 400 fuzz aleatórios,
  invariantes de memória e "database down → critical").

## Arquivos
- Novo: `src/lib/dbHealthGuard.ts`
- Novo: `src/lib/__tests__/dbHealthGuard.test.ts`
- Novo: `scripts/simulate-wave39-scenarios.mjs`
- Novo: `reports/simulations/wave39.json`
