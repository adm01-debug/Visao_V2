---
name: e2e-auth-seed-flow
description: Fluxo completo de seed + login E2E — global-setup.ts cria usuário via Admin API, persiste storageState; CI passa SUPABASE_SERVICE_ROLE_KEY para autenticar Dashboard/Heatmap/Analytics sem skip
type: feature
---
**Arquivos:**
- `tests/e2e/global-setup.ts` — global setup do Playwright (referenciado em `playwright.config.ts` via `globalSetup`)
- `scripts/seed-e2e-user.mjs` — wrapper standalone (`npm run seed:e2e-user`)
- `tests/e2e/.auth/` — storageState gerado (gitignored localmente via `.auth/.gitignore`)

**Fluxo (uma vez por suíte):**
1. **Seed via Admin API**: usa `SUPABASE_SERVICE_ROLE_KEY` para criar/atualizar `e2e-bot@visao.test` (default) com `email_confirm: true`. Idempotente — se existe, atualiza senha. Se senha não for fornecida, gera robusta (12+ chars, cases mistos, dígito, símbolo) e injeta em `process.env.E2E_TEST_PASSWORD` para workers.
2. **Login REST**: `grant_type=password` → obtém `access_token`/`refresh_token`.
3. **Persiste storageState**: `tests/e2e/.auth/user.json` no formato Playwright (cookies + origins.localStorage com chave `sb-<ref>-auth-token`), cobrindo origins `http://localhost:5173`, `http://localhost:4173` e `baseURL` ativo.
4. **Workers consomem**: `authSession.ts > tryRestoreStorageState()` carrega o JSON antes de qualquer navegação → `gotoAuthenticated()` retorna `true` → testes em DashboardV2/HeatmapPage/AnalyticsPage rodam sem skip.

**Skip controlado mantido**: se `SUPABASE_SERVICE_ROLE_KEY` ausente no env, setup pula silenciosamente, e os specs caem no skip via `authSession.ts` (camadas estáticas seguram a cobertura).

**CI** (`.github/workflows/e2e.yml`): passa `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` como secrets — todos opcionais (graceful degradation).

**Segurança:**
- Setup recusa rodar se URL contém `prod` (defesa extra).
- Storage state NUNCA commitado (`tests/e2e/.auth/.gitignore` ignora tudo exceto si próprio).
- Service key apenas em CI/dev local — nunca no client.

**NPM scripts:**
- `npm run seed:e2e-user` — seed standalone (útil em dev local antes de testar preview manualmente).

**Default user:** `e2e-bot@visao.test` (override via `E2E_TEST_EMAIL`). Role atribuída automaticamente: `viewer` (via trigger `handle_new_user_role`).
