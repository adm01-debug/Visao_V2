---
name: mobile-nav-checklist
description: mb-mobile-nav vive no MainLayout único; páginas não redeclaram (validado por script)
type: feature
---
A classe `mb-mobile-nav` é aplicada **uma única vez** no `<main>` de `src/components/layout/MainLayout.tsx`. Como todas as rotas autenticadas passam pelo `ProtectedLayoutRoute → MainLayout`, isso cobre 100% das páginas. Páginas NÃO devem redeclarar a classe — causa dupla margem.

**Script:** `scripts/check-mobile-nav.mjs` valida (a) que `MainLayout.tsx` contém a classe e (b) que nenhuma página em `src/pages/*.tsx` redeclara. Encadeado em `prebuild` e CI (`.github/workflows/ci.yml`). Exit code 1 quebra build.

**Allowlist** (páginas standalone fora do MainLayout): `AuthPage.tsx`, `Auth.tsx`, `AuthCallback.tsx`, `ResetPasswordPage.tsx`, `NotFound.tsx`, `Index.tsx`, `AcessoNegado.tsx`.

**Documentação:** `docs/LAYOUTS.md` seção 11.
