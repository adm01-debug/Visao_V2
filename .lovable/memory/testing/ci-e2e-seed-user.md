---
name: ci-e2e-seed-user
description: Script `seed:e2e-user:ci` cria/atualiza usuário E2E via Supabase Admin API antes dos testes Playwright em CI; auto-hookado via `pretest:e2e:ci`
type: feature
---
**Script:** `scripts/seed-e2e-user.mjs` (suporta flag `--ci`).

**Fluxo CI:**
1. CI roda `npm run test:e2e:ci`.
2. npm dispara `pretest:e2e:ci` → `seed:e2e-user:ci` automaticamente (lifecycle hook).
3. Seeder lista `auth/v1/admin/users`, cria ou atualiza o usuário `E2E_TEST_EMAIL` (default `e2e-bot@visao.test`) com `email_confirm: true` e a senha de `E2E_TEST_PASSWORD`.
4. Smoke login via `/auth/v1/token?grant_type=password` valida credenciais antes do Playwright iniciar.
5. `test:e2e:ci` roda com `E2E_AUTH_REQUIRED=1` → helper `gotoAuthenticated` falha (não skip) se o login não funcionar.

**Modo `--ci` (estrito):**
- Ativado por `--ci`, `CI=true` ou `E2E_SEED_STRICT=1`.
- **Bloqueia geração automática de senha** — exige `E2E_TEST_PASSWORD` definida explicitamente para garantir reprodutibilidade entre runs e drift zero entre seed e cliente.
- Em dev local (sem `CI`), gera senha forte e imprime para reuso.

**Vars obrigatórias:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `E2E_TEST_PASSWORD` (CI), opcional `E2E_TEST_EMAIL`.

**Scripts npm:**
- `seed:e2e-user` — dev local (auto-gera senha se ausente)
- `seed:e2e-user:ci` — CI estrito
- `pretest:e2e:ci` — hook automático (npm)
- `test:e2e:ci` — Playwright com `E2E_AUTH_REQUIRED=1`
