---
name: mobile-nav-checklist
description: mb-mobile-nav vive no MainLayout único como padding-bottom; fallback CSS via [data-app-scroll] cobre wrappers customizados; script valida não-duplicação
type: feature
---
**Defesa em profundidade (3 camadas):**

1. **Classe explícita** `mb-mobile-nav` no `<main>` de `src/components/layout/MainLayout.tsx` (e `src/layouts/MainLayout.tsx`). Implementada como `padding-bottom: calc(4rem + safe-area-inset-bottom)` em `src/index.css`.

2. **Fallback CSS global** via atributo `data-app-scroll` no `<SwipeableView>` do layout. Regra em `src/index.css` aplica o mesmo `padding-bottom` automaticamente ao último filho (`main`/`div`/`section`) que **não** tenha `mb-mobile-nav` — protege wrappers customizados que esquecem a classe. Seletor: `[data-app-scroll] > {main,div,section}:last-child:not(.mb-mobile-nav)`.

3. **Script de auditoria** `scripts/check-mobile-nav.mjs` valida (a) wrapper contém a classe, (b) nenhuma página redeclara `mb-mobile-nav`, (c) nenhuma página usa `h-[calc(100vh-...)]` (causa scroll duplo). Encadeado em `prebuild` e CI.

**MainLayout usa `h-screen h-[100dvh]`** — `dvh` sobrescreve `vh` em browsers compatíveis, evitando overflow no iOS Safari.

**SwipeableView** propaga `data-app-scroll` via `...rest` em ambos os branches (mobile com motion.div e desktop com div simples).

**Anti-padrões proibidos em páginas:**
1. Redeclarar `mb-mobile-nav` (causa dupla margem)
2. Usar `h-[calc(100vh-4rem)] overflow-auto` no container raiz (scroll duplo, quebra momentum iOS)

**Allowlist (páginas fora do MainLayout):** `AuthPage.tsx`, `Auth.tsx`, `AuthCallback.tsx`, `ResetPasswordPage.tsx`, `NotFound.tsx`, `Index.tsx`, `AcessoNegado.tsx`.

