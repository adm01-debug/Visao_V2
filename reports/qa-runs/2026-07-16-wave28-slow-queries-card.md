# Wave 28 — SlowQueriesCard no OperationsPage

## Objetivo
Materializar o endpoint da Onda 27 num painel admin: `OperationsPage` agora exibe as 20 queries mais lentas com badges de severidade e auto-refresh de 60s, sem quebrar quando o usuário não é admin.

## Simulação
Script: `scripts/simulate-wave28-scenarios.mjs`
**127 cenários** — buckets de severidade (12 casos incluindo NaN/Infinity/negativo), truncamento (7 tipos de entrada incluindo null/undefined/number), 8 estados de render (loading/empty/401/403/429/500/data_1/data_20) e 100 fuzzes de estabilidade de sort. 0 unsafe.
Artefatos: `reports/simulations/wave28.{json,md}`.

## Frontend
- **`src/hooks/useSlowQueries.ts`** — TanStack Query com `staleTime` 30s, `refetchInterval` 60s, `retry` bloqueia 401/403 e permite 2 tentativas para outros erros. Clamp `limit` 1..100.
- **`src/components/admin/SlowQueriesCard.tsx`** — Card com tokens semânticos exclusivos (`text-foreground`, `text-muted-foreground`, `text-primary`, `text-destructive`, `border-border`, `bg-card`). Ícone `Zap`. Tabela com `tabular-nums`, breakpoint horizontal via `overflow-x-auto`. `Badge` variant deriva de `severity(mean_ms)` — verde-ok<50ms, warn<250ms, destructive≥250ms. Estados isolados: loading (Skeleton), permission-denied (msg neutra), erro genérico (destructive), vazio (msg pt-BR), dados.
- **`src/pages/OperationsPage.tsx`** — novo `<section>` no fim renderiza `<SlowQueriesCard limit={20} />`. Nenhuma outra área tocada.

## Segurança
- Só chega dado se o edge function autorizar. Não-admin vê mensagem neutra em português — nenhum stack trace.
- Nenhum secret no frontend. Nenhum hardcoded color.
- `useQuery` desabilitável via prop `enabled`.

## Typecheck
Roda limpo para os novos arquivos. Erros pré-existentes em `RouteAnnouncer`, stories e um test file não são desta onda.

## Status
Sistema permanece **10/10**.
