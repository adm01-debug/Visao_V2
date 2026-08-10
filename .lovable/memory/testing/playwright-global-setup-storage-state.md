---
name: playwright-global-setup-storage-state
description: Global setup do Playwright cria/reusa storageState em tests/e2e/.auth/user.json — login Supabase 1x e cache até 5min antes de expirar; bypass via E2E_FORCE_RESEED=1
type: feature
---

**Arquivos:** `tests/e2e/global-setup.ts` + `playwright.config.ts`.

**Fluxo:**

1. `playwright.config.ts` referencia `globalSetup: ./tests/e2e/global-setup`.
2. Setup verifica cache: se `tests/e2e/.auth/user.json` existe **e** o `expires_at` do token `sb-<ref>-auth-token` ainda dura > 5 min → reusa, sem login.
3. Sem cache válido: seed via Supabase Admin API (cria/atualiza usuário) → login REST `grant_type=password` → escreve `storageState` no formato Playwright (`{ cookies, origins: [{ origin, localStorage: [{ name: 'sb-<ref>-auth-token', value }] }] }`).
4. `playwright.config.ts` carrega `storageState: sharedStorageState` no `use` global — aplicado condicionalmente via `existsSync` (evita erro de boot se arquivo não existir).
5. Helper `gotoAuthenticated` (camadas 2 e 3) cobre primeira run sem cache + skip controlado.

**Funções principais:**

- `tryReuseStorageState(path, ref)` — valida JSON, presença da chave, `expires_at - now > 300s`. Retorna boolean.
- `createOrUpdateUser` / `signIn` / `writeStorageState` — exportados para reuso em scripts standalone.

**Vars:**

- `E2E_FORCE_RESEED=1` — ignora cache (usar quando rotacionar credenciais).
- `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` — overrides (default `e2e-bot@visao.test` + senha gerada).
- `SUPABASE_SERVICE_ROLE_KEY` — necessária para seed admin.

**Segurança:** `tests/e2e/.auth/` deve estar no `.gitignore` (ver tarefa de manutenção). `.auth/user.json` contém access/refresh tokens — nunca commitar.

**Performance:** primeira run faz seed+login (~1.5s); runs seguintes reusam (~0ms até token expirar em 1h, descontando margem de 5min).
