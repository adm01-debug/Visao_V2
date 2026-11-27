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

## Guardrails de banco (`npm run db:check:*`)

Os `scripts/check-*.mjs` (e alguns `.ts`) não são utilitários de build: são
guardrails que rodam SQL contra um Postgres real via `SUPABASE_DB_URL` e
**falham** quando um invariante de segurança ou de integridade deixa de valer.
Rodam no job "Guardrails de banco" do CI e localmente pelo npm:

| Alvo npm                   | Script                             | Invariante                                                                                                                  |
| -------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `db:check:delete-account`  | `check-delete-account-lgpd.mjs`    | `delete_user_data(uuid)` apaga o titular, preserva a trilha de silenciamentos anonimizada e libera `auth.users` (LGPD)      |
| `db:check:settings-backup` | `check-settings-backup-import.mjs` | `import_settings_backup(jsonb, text)` persiste câmeras/zonas/regras/notificações, mantém os pares câmera↔zona e não duplica |
| `db:check:definer`         | `check-definer-exposure.mjs`       | `SECURITY DEFINER` sem `search_path` fixo / exposto a `anon`                                                                |
| `db:check:rls`             | `check-rls-exposure.mjs`           | Tabela com RLS desligada ou política permissiva em `public`                                                                 |
| `db:check:dba`             | `check-dba-privileges.mjs`         | Privilégio de DBA concedido a role de aplicação                                                                             |

Um guardrail novo só entra em `package.json` **e** nesta tabela. Ele precisa
funcionar em transação com `ROLLBACK` (não deixa resíduo no banco alvo) e
reportar **exit 3** quando o banco alvo ainda não tem a migration da PR aplicada
(evita confundir "banco atrasado" com "regressão de código").

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
