---
name: Admission Backlog Fan-in
description: 'Onda 232: fan-in do passivo do expurgo do livro de admissão (I1–I8), passivo é eixo separado do silêncio da rotina, espelho SQL evaluate_admission_backlog_alerts, gate db:check:admission-backlog'
type: feature
---

# Onda 232 — Fan-in do passivo do expurgo

Régua pura: `src/lib/alarms/admissionBacklogAlert.ts`.

Leis:

- **I1** só execução `valid` (Onda 231) alimenta o veredito; linha suja não prova nem alivia.
- **I2** sem execução legível → `no_data`, **nunca** emite (silêncio de rotina é do fan-in de retenção, Onda 135 — emitir aqui duplicaria com culpa errada).
- **I3** passivo zero na execução mais recente encerra (`clear`), mesmo com histórico sujo de passivo.
- **I4** passivo isolado = `spike` → `warning`.
- **I5** ≥ `PERSIST_RUNS` (3) execuções consecutivas com passivo = `persistent` → `critical`.
- **I6** crescimento estrito no bloco contíguo = `growing` → `critical` (antes da persistência).
- **I7** cooldown = clamp(cadência, 60, **1440**) — teto maior que o do fan-in de retenção (360) porque a rotina é diária.
- **I8** chave `admission_backlog:ledger_purge`.

Espelho SQL: `admission_backlog_classify(bigint[])` (núcleo puro IMMUTABLE, recebe a série **já cortada** na janela), `admission_backlog_assess(int)` (aplica a janela e as guardas de validade) e `evaluate_admission_backlog_alerts(timestamptz)` (grava no barramento com cooldown). Cron `17 4 * * *`, 30 min depois do expurgo (`47 3 * * *`).

Armadilhas:

- O gate deve cortar as sondas em `PERSIST_RUNS` antes de mandar ao `classify`, senão acusa falsa quebra de paridade (o corte mora no `assess`).
- `pg_get_function_identity_arguments` devolve **nome + tipo** (`p_series bigint[]`); casar por igualdade com o tipo puro faz o gate dizer "função não existe".

Validação: `npm run simulate:wave232` (201.579 asserções), `npm run db:check:admission-backlog` (341 sondas), testes em `src/lib/alarms/__tests__/admissionBacklogAlert.test.ts`.
