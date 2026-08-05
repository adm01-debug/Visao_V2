# Onda 36 — Dedup persistente em sessionStorage (CronStaleWatcher)

**Data:** 2026-07-16
**Status:** ✅ 10/10 mantido

## Problema

O dedup por `useRef` era perdido em qualquer remount (navegação SPA que
desmonta o `App` durante hot-reload, F5, ou remontagem via `Suspense`).
Resultado: admin recebia o mesmo toast "Cron atrasado" repetidas vezes.

## Solução

- Chave persistida em `sessionStorage` (`visao:cron-stale-notified:v1`).
- Chave composta `${jobname}::${last_run}` — nova execução do cron
  (mesmo que ainda `stale`) gera **novo** alerta, evitando falso silêncio.
- Reset natural ao fechar a aba (escopo `sessionStorage`).
- Fallback silencioso em modo privado / quota excedida.

## Testes

- `CronStaleWatcher.test.tsx` — **8/8 pass** (+2 novos: persistência entre
  remounts, revive em nova `last_run`).
- Simulação `wave36`: **202/202 pass** (20 remounts + revive + 200 fuzz).

## Arquivos

- Editado: `src/components/admin/CronStaleWatcher.tsx`
- Editado: `src/components/admin/__tests__/CronStaleWatcher.test.tsx`
- Novo: `scripts/simulate-wave36-scenarios.mjs`
- Novo: `reports/simulations/wave36.json`
