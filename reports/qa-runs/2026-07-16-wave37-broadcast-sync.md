# Onda 37 — BroadcastChannel sync entre abas (CronStaleWatcher)

**Data:** 2026-07-16
**Status:** ✅ 10/10 mantido

## Problema
`sessionStorage` é escopo-de-aba: dois monitores abertos pelo mesmo admin
mostravam o mesmo toast N vezes (uma por aba).

## Solução
- `BroadcastChannel('visao:cron-stale-ack')` propaga ack `{ jobname, last_run }`
  para todas as abas do mesmo browser em tempo real.
- Fallback silencioso quando `BroadcastChannel` indisponível (Safari <15.4,
  contexto SSR): comportamento cai para o dedup por aba da Onda 36.
- Cleanup adequado no unmount (`ch.close()`).

## Testes
- Unit: 8/8 pass (comportamento anterior intacto).
- Simulação `wave37`: **200/200 pass** — N abas (2-6) × M jobs (1-4) em
  ordem aleatória geram exatamente 1 toast por job entre todas as abas.

## Arquivos
- Editado: `src/components/admin/CronStaleWatcher.tsx`
- Novo: `scripts/simulate-wave37-scenarios.mjs`
- Novo: `reports/simulations/wave37.json`
