# Scripts

Utility scripts for VIS-O development and operations.

## Available Scripts

| Script                                | Description                                                                                                                                                                                                                                                                                                |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup.sh`                            | Initial project setup                                                                                                                                                                                                                                                                                      |
| `clean.sh`                            | Clean build artifacts                                                                                                                                                                                                                                                                                      |
| `analyze-bundle.sh`                   | Analyze bundle size                                                                                                                                                                                                                                                                                        |
| `health-check.sh`                     | Check application health                                                                                                                                                                                                                                                                                   |
| `generate-types.sh`                   | Generate TypeScript types from Supabase                                                                                                                                                                                                                                                                    |
| `check-camera-schedules-executor.mjs` | Guardrail do executor de agendamentos de camera: roda `tests/rls/camera-schedules-executor.sql` contra o banco de `SUPABASE_DB_URL` e falha (exit 1) se o arme/desarme por escopo regredir. Exit 3 = banco atrasado (migration nao aplicada), nao regressao de codigo. `npm run db:check:camera-schedules` |
| `check-cron-jobs-commands.mjs`        | Guardrail dos jobs do pg_cron: confere que os comandos usam `public.edge_function_url(...)` em vez de URL de projeto literal e que os segredos vem do banco. Exit 3 = banco atrasado. `npm run db:check:cron-jobs`                                                                                         |
| `check-critical-path.mjs`             | Guardrail do caminho critico (login, dashboard, camera ao vivo) contra o banco alvo. `npm run db:check:critical-path`                                                                                                                                                                                      |

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
