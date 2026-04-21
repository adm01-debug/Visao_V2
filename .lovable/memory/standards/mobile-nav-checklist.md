---
name: mobile-nav-checklist
description: Script automatizado garante mb-mobile-nav em todas as páginas roteadas
type: feature
---
Para evitar regressões de layout em mobile (overlap pela bottom navigation), o script `scripts/check-mobile-nav.mjs` valida automaticamente que toda página em `src/pages/*.tsx` (top-level) inclua a classe `mb-mobile-nav` OU use o wrapper `<PageContent>` (que aplica a classe internamente em `src/components/layout/MainLayout.tsx`).

**Execução:** `npm run check:mobile-nav` — encadeado em `prebuild` (executa antes de `vite build`) e no workflow CI (`.github/workflows/ci.yml`) antes dos testes. Exit code 1 quebra o build.

**Allowlist:** páginas isentas (auth, 404, callbacks, redirects) ficam na constante `ALLOWLIST` no topo do script: `AuthPage.tsx`, `Auth.tsx`, `AuthCallback.tsx`, `ResetPasswordPage.tsx`, `NotFound.tsx`, `Index.tsx`, `AcessoNegado.tsx`.

**Wrappers reconhecidos:** `PageContent` (extensível via constante `COMPLIANT_WRAPPERS`).

**Documentação:** `docs/LAYOUTS.md` seção 11.
