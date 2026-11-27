# Scripts

Utility scripts for VIS-O development and operations.

## Available Scripts

| Script                                | Description                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup.sh`                            | Initial project setup                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `clean.sh`                            | Clean build artifacts                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `analyze-bundle.sh`                   | Analyze bundle size                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `health-check.sh`                     | Check application health                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `generate-types.sh`                   | Generate TypeScript types from Supabase                                                                                                                                                                                                                                                                                                                                                                                                     |
| `check-camera-schedules-executor.mjs` | Guardrail do executor de agendamentos de camera: roda `tests/rls/camera-schedules-executor.sql` contra o banco de `SUPABASE_DB_URL` e falha (exit 1) se o arme/desarme por escopo regredir. Exit 3 = banco atrasado (migration nao aplicada), exit 2 = psql ausente, exit 1 = regressao. `npm run db:check:camera-schedules` (estrito, para operacao) e `npm run db:check:camera-schedules:ci` (tolera o exit 3, usado pelo `db:check:all`) |
| `check-cron-jobs-commands.mjs`        | Guardrail dos jobs do pg_cron: confere que os comandos usam `public.edge_function_url(...)` em vez de URL de projeto literal e que os segredos vem do banco. Exit 3 = banco atrasado. `npm run db:check:cron-jobs` (estrito) ou `db:check:cron-jobs:ci` (o CI usa, tolera banco atrasado)                                                                                                                                                   |
| `check-critical-path.mjs`             | Guardrail do caminho critico (login, dashboard, camera ao vivo) contra o banco alvo. `npm run db:check:critical-path`                                                                                                                                                                                                                                                                                                                       |

### Gates de banco (`npm run db:check:*`)

Cada guard `scripts/check-*.mjs` valida um contrato do banco real (o apontado por `SUPABASE_DB_URL`) rodando
a suite correspondente em `tests/rls/` dentro de uma transacao que termina em `ROLLBACK`.

| Comando                     | O que valida                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `db:check:cron-jobs`        | Comandos dos 14 jobs do `pg_cron`: URL e cabecalhos por helper, nenhum segredo literal no comando (o CI roda a variante `:ci`, que tolera banco atrasado) |
| `db:check:camera-schedules` | Executor de agenda de cameras (detalhe em `docs/agentes/banco.md`)                                                                                        |
| `db:check:all`              | Todos os gates, na ordem em que o CI (`db-guardrails`) espera                                                                                             |

Registro: todo script novo em `scripts/` precisa de uma entrada em `scripts/automation.config.json`
(`npm run automation -- doctor --static` reprova o PR sem ela).

## Guardrails de banco (`npm run db:check:*`)

Os `scripts/check-*.mjs` (e alguns `.ts`) não são utilitários de build: são
guardrails que rodam SQL contra um Postgres real via `SUPABASE_DB_URL` e
**falham** quando um invariante de segurança ou de integridade deixa de valer.
Rodam no job "Guardrails de banco" do CI e localmente pelo npm:

| Alvo npm                  | Script                          | Invariante                                                                                                             |
| ------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `db:check:delete-account` | `check-delete-account-lgpd.mjs` | `delete_user_data(uuid)` apaga o titular, preserva a trilha de silenciamentos anonimizada e libera `auth.users` (LGPD) |
| `db:check:definer`        | `check-definer-exposure.mjs`    | `SECURITY DEFINER` sem `search_path` fixo / exposto a `anon`                                                           |
| `db:check:drift`          | `check-schema-drift.mjs`        | Função do histórico ausente no banco, recriada sem `search_path` fixo, ou que perdeu `SECURITY DEFINER`                |
| `db:check:rls`            | `check-rls-exposure.mjs`        | Tabela com RLS desligada ou política permissiva em `public`                                                            |
| `db:check:dba`            | `check-dba-privileges.mjs`      | Privilégio de DBA concedido a role de aplicação                                                                        |

Um guardrail novo só entra em `package.json` **e** nesta tabela. Ele precisa
funcionar em transação com `ROLLBACK` (não deixa resíduo no banco alvo).

## Usage

```bash
# Make executable
chmod +x scripts/*.sh

# Run script
./scripts/setup.sh
```

## Adding New Scripts

1. Create script in `scripts/` directory
2. Add shebang (`#!/bin/bash`)
3. Make executable
4. Document in this README
