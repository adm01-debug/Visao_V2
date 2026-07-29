---
name: Suppression Retention
description: Onda 243 — guarda de retenção da trilha de supressão (T1–T9), âncora por condição impede que "starved" vire "sem histórico", cron 37 3 * * *, gate db:check:suppression-retention
type: feature
---
# Onda 243 — Guarda de retenção da trilha do ruído evitado

**Defeito corrigido:** a trilha da Onda 242 crescia sem prazo. Pior: um expurgo
ingênuo por data apagaria justamente as condições `starved` (caladas e nunca
entregues), transformando a pior evidência em "sem histórico" — o veredito mais
inofensivo da régua.

## Leis T1–T9 (`src/lib/maintenance/suppressionRetention.ts`)
- **T1** relógio ilegível recusa o expurgo inteiro (`bad_now`), nunca "usa agora".
- **T2** prazo obrigatoriamente inteiro na faixa **30–730 dias**; fora disso recusa.
- **T3** corte é `now - retentionDays`; empate exato **preserva**.
- **T4** **âncora por condição**: as N linhas mais recentes de cada condição são
  intocáveis. Nenhuma condição legível pode ficar com zero linhas.
- **T5** linha ilegível (condição vazia, canal desconhecido, janela ≤0 ou
  absurda, instante inválido) vai para **quarentena** — nunca é apagada.
- **T6** teto de lote apaga as **mais antigas primeiro** e declara `deferred`.
- **T7** contabilidade fechada: `examined = kept + anchored + deleted + deferred + quarantined`.
- **T8** determinismo: a ordem de entrada não altera o plano.
- **T9** instante no futuro nunca autoriza remoção (vai para quarentena).

## Banco
- `public.maintenance_suppression_purge_runs` — trilha imutável (gatilho
  `trg_block_suppression_purge_run_mutation`), RLS FORCE, SELECT só admin,
  `anon` sem privilégio.
- `public.purge_dispatch_suppressions(days, cap, anchor, now)` — SECURITY
  DEFINER, `search_path=public`, service_role apenas; desabilita
  temporariamente o append-only da origem e **reabilita** (gate verifica `:O`).
- `public.suppression_retention_selftest()` — 13 guardas, exercício dinâmico.
- Cron `37 3 * * *` (`purge-dispatch-suppressions`), registrada em
  `retention_routine_registry` com cadência 1440 min.

## Gates
- `npm run simulate:wave243` — 25.927 cenários / 289.425 asserções.
- `npm run test:wave243` — 9 testes T1–T9.
- `npm run db:check:suppression-retention` — 88 sondas, 10 cenários TS↔SQL,
  incluído em `db:check:all`.
