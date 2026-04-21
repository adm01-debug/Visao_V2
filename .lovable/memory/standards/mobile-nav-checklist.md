---
name: mobile-nav-checklist
description: mb-mobile-nav vive no MainLayout único como padding-bottom; páginas não redeclaram nem criam scroll duplo (validado por script)
type: feature
---
A classe `mb-mobile-nav` é aplicada **uma única vez** no `<main>` de `src/components/layout/MainLayout.tsx`. Implementada como **`padding-bottom: calc(4rem + safe-area-inset-bottom)`** (não margin) em `src/index.css` — mais robusto contra colapso de margem dentro de containers `overflow-auto`. Cobre 100% das rotas autenticadas via `ProtectedLayoutRoute → MainLayout`.

**Anti-padrões proibidos em páginas:**
1. Redeclarar `mb-mobile-nav` (causa dupla margem)
2. Usar `h-[calc(100vh-4rem)] overflow-auto` no container raiz (causa scroll duplo aninhado dentro do `SwipeableView`, quebra momentum no iOS Safari e esconde conteúdo atrás do BottomNavigation porque `100vh` no iOS inclui a barra de URL dinâmica)

**MainLayout usa `h-screen h-[100dvh]`** — `dvh` (dynamic viewport height) sobrescreve `vh` em browsers compatíveis, evitando overflow quando a barra de URL do iOS aparece/desaparece.

**Script:** `scripts/check-mobile-nav.mjs` valida (a) wrapper contém a classe, (b) nenhuma página redeclara, (c) nenhuma página usa `h-[calc(100vh-...)]`. Encadeado em `prebuild` e CI. Exit code 1 quebra build.

**Allowlist:** `AuthPage.tsx`, `Auth.tsx`, `AuthCallback.tsx`, `ResetPasswordPage.tsx`, `NotFound.tsx`, `Index.tsx`, `AcessoNegado.tsx`.
