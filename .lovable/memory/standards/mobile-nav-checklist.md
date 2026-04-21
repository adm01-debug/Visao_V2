---
name: mobile-nav-checklist
description: mb-mobile-nav vive no MainLayout único; fallback CSS via [data-app-scroll]; allowlist para wrappers customizados; script valida posição correta
type: feature
---
**Defesa em profundidade (4 camadas):**

1. **Classe explícita** `mb-mobile-nav` no `<main>` de `src/components/layout/MainLayout.tsx` (e `src/layouts/MainLayout.tsx`). Implementada como `padding-bottom: calc(4rem + safe-area-inset-bottom)` em `src/index.css`.

2. **Fallback CSS global** via atributo `data-app-scroll` no `<SwipeableView>` do layout. Regra em `src/index.css` aplica o mesmo `padding-bottom` automaticamente ao último filho (`main`/`div`/`section`) que **não** tenha `mb-mobile-nav` — protege wrappers customizados que esquecem a classe. Seletor: `[data-app-scroll] > {main,div,section}:last-child:not(.mb-mobile-nav)`.

3. **Allowlist de wrappers customizados** — páginas que substituem o `<main>` do MainLayout por wrapper próprio (`min-h-screen` ou Sidebar embutido) devem reaplicar `mb-mobile-nav` explicitamente E entrar na `CUSTOM_WRAPPER_ALLOWLIST` do script. Atualmente: `DashboardV2.tsx`, `HeatmapPage.tsx`, `AnalyticsPage.tsx`, `TelegramSettingsPage.tsx`.

4. **Script de auditoria** `scripts/check-mobile-nav.mjs` valida (a) wrapper contém a classe, (b) páginas padrão NÃO redeclaram `mb-mobile-nav`, (c) páginas na `CUSTOM_WRAPPER_ALLOWLIST` CONTÊM `mb-mobile-nav`, (d) nenhuma página usa `h-[calc(100vh-...)]` (scroll duplo). Encadeado em `prebuild` e CI.

**MainLayout usa `h-screen h-[100dvh]`** — `dvh` sobrescreve `vh` em browsers compatíveis, evitando overflow no iOS Safari.

**SwipeableView** propaga `data-app-scroll` via `...rest` em ambos os branches (mobile com motion.div e desktop com div simples).

**Anti-padrões proibidos em páginas padrão:**
1. Redeclarar `mb-mobile-nav` (causa dupla margem) — exceto em `CUSTOM_WRAPPER_ALLOWLIST`
2. Usar `h-[calc(100vh-4rem)] overflow-auto` no container raiz (scroll duplo, quebra momentum iOS)

**Allowlist standalone (fora do MainLayout):** `AuthPage.tsx`, `Auth.tsx`, `AuthCallback.tsx`, `ResetPasswordPage.tsx`, `NotFound.tsx`, `Index.tsx`, `AcessoNegado.tsx`.
