# Wave 31 — Migration Lint Gate

**Simulação:** 106 cenários (R1 sem RLS, R2 sem GRANT, R3 SECURITY DEFINER sem search_path, R5 GRANT TO PUBLIC, casos OK + 100 fuzz). 106/106 pass, 0 unsafe.

## Regras aplicadas

- **R1** — Tabela sem `ENABLE ROW LEVEL SECURITY` no histórico
- **R2** — Tabela sem `GRANT` p/ `authenticated` ou `service_role`
- **R3** — Função `SECURITY DEFINER` sem `SET search_path`
- **R5** — `GRANT ... TO PUBLIC` sem justificativa

## Baseline

Migrações anteriores a `20260716` refletem estado herdado (105 files, 47 tabelas). Só migrações **≥ 20260716** são checadas — protege contra regressões novas sem exigir backfill retroativo.

## Supressão

`-- lint-ignore: R<n> motivo` numa linha da migração desliga a regra para aquela linha.

## Integração

- **`package.json`**: `check:migrations` = `node scripts/lint-migrations.mjs`
- **`.github/workflows/ci.yml`**: novo step "Migration Lint" logo após o Full Check

## Validação

`npm run check:migrations` → `✓ Migration lint OK — 105 arquivos, 47 tabelas verificadas`

Status: **10/10** mantido, banco protegido contra regressões estruturais.
