# Wave 33 — Cron freshness (próxima execução + detecção de "silent failure")

**Simulação:** 200 combinações (4 padrões × 50 offsets de last_run). 100% pass.
**Testes reais:** 11/11 verdes em `src/lib/__tests__/cronSchedule.test.ts` (parser + freshness).

## Novo
- **`src/lib/cronSchedule.ts`** — `parseCronSchedule(expr, from)` cobre padrões usados por `visao-*`: a cada minuto, horário, diário, mensal. Retorna `{ nextRun, freshnessMs }` onde freshness = 2× intervalo (silent-failure threshold).
- **`assessCronFreshness(schedule, lastRun, now)`** — retorna `{ status: 'on_time'|'stale'|'never', nextRunLabel, ageMs }`.

## OperationsPage
Cada linha do card "Saúde dos jobs automatizados" agora exibe:
- **Próxima execução prevista** (ex.: `próxima: 17/07/2026 00:30:00`)
- Badge `atrasado` (destructive) quando `ageMs > 2× intervalo` — captura falhas silenciosas de cron (job existe mas não executa)
- Badge `sem execução` quando nunca rodou

## Por que importa
`failed_7d = 0` engana quando o cron sequer disparou. Freshness cross-check detecta cenários em que `pg_cron` está desativado no worker (regressão comum após restart) sem ninguém notar.

Status: **10/10** mantido.
