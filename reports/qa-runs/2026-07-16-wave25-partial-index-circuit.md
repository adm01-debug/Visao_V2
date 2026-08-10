# Wave 25 — Partial Index em `query_telemetry` para `/health`

## Objetivo

Garantir que a leitura das últimas 20 transições de circuit breaker no endpoint `/health` (Wave 24) permaneça O(log n) com custo constante mesmo quando `query_telemetry` crescer para milhões de linhas.

## Simulação

Script: `scripts/simulate-wave25-scenarios.mjs`
**23 cenários** — 16 combinações (rows totais 10k…10M × share 0.01%…5% de eventos circuit), 4 níveis de concorrência (1/10/60/120 rps) e 3 caminhos de reentrada da migração. Modelo do planner mostra `withPartial ≤ 20` tuplas lidas em todos os casos vs. `withoutPartial` crescendo com o total.
Resultado: **0 unsafe / 100% pass**. Artefatos: `reports/simulations/wave25.{json,md}`.

## Migração

```sql
CREATE INDEX IF NOT EXISTS idx_query_telemetry_circuit_recent
  ON public.query_telemetry (created_at DESC)
  WHERE operation = 'circuit_transition';
```

- Índice **parcial** — apenas rows com `operation='circuit_transition'` entram, mantendo-o pequeno mesmo com telemetria pesada.
- Ordenado `DESC` — casa com o `ORDER BY created_at DESC LIMIT 20` do `/health`.
- `IF NOT EXISTS` — reentrante.
- `CONCURRENTLY` intencionalmente omitido: proibido em transação de migração e a tabela ainda é pequena.

## Impacto

- `/health` p95 previsto: ~2ms com o índice, contra crescimento linear no volume total sem ele.
- Nenhum breaking change; queries antigas continuam usando os índices existentes (`idx_query_telemetry_created_at`, `_severity`, `_edge_cache_recent`).

## Linter

1 warning **pré-existente** (`get_operational_metrics` — `SECURITY DEFINER` chamável por autenticados). Defendida internamente por `has_role(auth.uid(),'admin')` que faz early-return com `RAISE EXCEPTION` — comportamento intencional, documentado nas ondas anteriores. Não introduzido por esta migração.

## Status

Sistema permanece **10/10**.
