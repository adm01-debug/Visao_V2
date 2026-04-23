---
name: e2e-auth-session-helper
description: Helper centralizado tests/e2e/helpers/authSession.ts — restore storage state, login Supabase REST programático, ou skip controlado; usado pelos 3 specs mobile-nav
type: feature
---
**Helper:** `tests/e2e/helpers/authSession.ts`

**Estratégia em 3 camadas (cascata):**

1. **Storage state** — `tests/e2e/.auth/user.json` (gerado por setup global ou commitado em ambiente seguro). Restaurado via `tryRestoreStorageState`.
2. **Login REST programático** — Se `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` estão no env: chama `/auth/v1/token?grant_type=password`, injeta `access_token`/`refresh_token` no `localStorage` da página com chave `sb-<ref>-auth-token` (formato esperado pelo `@supabase/supabase-js v2`). Sessão cacheada por worker.
3. **Skip controlado** — Se rota redireciona para `/auth` e nada autenticou: `test.skip(true, ...)` com mensagem clara apontando cobertura estática (Camada 4).

**API pública:**
- `gotoAuthenticated(page, path, options?)` → navega autenticando se possível, retorna `false` se skipped. Usado em `mobile-nav-padding` e `mobile-nav-overlap`.
- `ensureAuthenticatedContext(context)` → pré-popula contexto antes de navegação manual. Usado em `mobile-nav-class-presence`.
- `isAuthRedirect(url)` → util compartilhado.

**Env vars:**
- `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD` — credencial seed (criar usuário com `npm run seed:e2e-user` ou via dashboard Lovable Cloud).
- `E2E_AUTH_REQUIRED=1` — força FALHA em vez de skip quando auth indisponível.
- `MOBILE_NAV_CLASS_AUTH_BYPASS=1` — alias para skip explícito (mantido por compat com `mobile-nav-class-presence.spec.ts`).
- `E2E_AUTH_LOG=0` — silencia os logs por rota (default: ligado).

**Logs por rota** (formato `[authSession] <OUTCOME> <route> — <detail>`):
- `OK storage-state` — sessão carregada de `tests/e2e/.auth/user.json`.
- `OK rest-login` — login programático via `/auth/v1/token`.
- `OK anon-or-public` — rota não exigiu auth (página pública); detalhe inclui `strategy=...`.
- `SKIP no-credentials` — sem `E2E_TEST_*` no env, redirect para `/auth`.
- `SKIP login-failed` — credenciais presentes mas login REST retornou erro.
- `SKIP redirect-to-auth` — sessão estabelecida mas rota ainda redirecionou (regressão RLS/role?).
- `FAIL redirect` — `E2E_AUTH_REQUIRED=1` + redirect → throw.

**API extra:** `getLastAuthStrategy()` retorna `'storage-state' | 'rest-login' | 'unavailable' | 'failed' | null` para asserções em specs.

**Specs que usam:**
- `tests/e2e/mobile-nav-padding.spec.ts` (15 rotas autenticadas)
- `tests/e2e/mobile-nav-overlap.spec.ts` (3 páginas × 3 viewports = 9 cases)
- `tests/e2e/mobile-nav-class-presence.spec.ts` (21 rotas autenticadas)

Local sem credenciais: skip silencioso. CI com seed: cobertura runtime completa. Cobertura estática (Camada 4 do `mobile-nav-checklist`) sempre roda independente.
