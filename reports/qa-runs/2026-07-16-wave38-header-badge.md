# Onda 38 — Badge de crons atrasados no Header (admin)

**Data:** 2026-07-16
**Status:** ✅ 10/10 mantido

## Motivação

Toasts (Ondas 34/36/37) são efêmeros. Admin que perde o toast e não abre
`/operations` fica sem sinal visual persistente do problema.

## Implementação

- `src/components/admin/CronStaleBadge.tsx` — badge destrutivo com
  contagem, plural correto (`1 cron atrasado` / `N crons atrasados`),
  ícone `AlertTriangle`, tooltip com lista dos jobs (até 5 + "…").
- Link direto para `/operations`. `aria-label` semanticamente correto.
- Gate por `useUserRole().isAdmin` + oculto quando `count === 0`.
- Injetado no `Header` (`hidden md:inline-flex`) — mobile mantém enxuto.

## Testes

- Unit: **5/5 pass** (não-admin, loading, saudável, singular, plural).
- Simulação `wave38`: **306/306 pass** (6 determinísticos + 300 fuzz).
- Type-check `tsgo` verde.

## Arquivos

- Novo: `src/components/admin/CronStaleBadge.tsx`
- Novo: `src/components/admin/__tests__/CronStaleBadge.test.tsx`
- Editado: `src/components/Header.tsx`
- Novo: `scripts/simulate-wave38-scenarios.mjs`
- Novo: `reports/simulations/wave38.json`
