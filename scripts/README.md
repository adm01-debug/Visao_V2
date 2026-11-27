# Scripts

Utility scripts for VIS-O development and operations.

## Available Scripts

| Script              | Description                             |
| ------------------- | --------------------------------------- |
| `setup.sh`          | Initial project setup                   |
| `clean.sh`          | Clean build artifacts                   |
| `analyze-bundle.sh` | Analyze bundle size                     |
| `health-check.sh`   | Check application health                |
| `generate-types.sh` | Generate TypeScript types from Supabase |

### Gates de banco (`npm run db:check:*`)

Cada guard `scripts/check-*.mjs` valida um contrato do banco real (o apontado por `SUPABASE_DB_URL`) rodando
a suite correspondente em `tests/rls/` dentro de uma transacao que termina em `ROLLBACK`.

| Comando                     | O que valida                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `db:check:cron-jobs`        | Comandos dos 14 jobs do `pg_cron`: URL e cabecalhos por helper, nenhum segredo literal no comando |
| `db:check:camera-schedules` | Executor de agenda de cameras (detalhe em `docs/agentes/banco.md`)                                |
| `db:check:all`              | Todos os gates, na ordem em que o CI (`db-guardrails`) espera                                     |

Registro: todo script novo em `scripts/` precisa de uma entrada em `scripts/automation.config.json`
(`npm run automation -- doctor --static` reprova o PR sem ela).

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
