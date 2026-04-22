---
name: page-content-standard
description: PageContent component is canonical wrapper for authenticated pages — provides consistent space-y-6, optional maxWidth/spacing/className. Padding/mb-mobile-nav stay in MainLayout's <main>. Enforced by scripts/check-page-content.mjs (warn for pending migration, hard-fail for new pages without it). 27 pages pending migration tracked in PENDING_MIGRATION list.
type: feature
---
**Componente:** `PageContent` em `src/components/layout/MainLayout.tsx`.

**Contrato:**
- Páginas autenticadas usam `<PageContent>` como wrapper raiz.
- `PageContent` aplica apenas `space-y-{4|6|8}` + `max-w-*` opcional + `data-page-content`.
- Padding (`p-4 md:p-6`), `min-h-full` e `mb-mobile-nav` ficam no `<main>` do `MainLayout` — única fonte de verdade.
- Scroll oficial: `[data-app-scroll]` no `SwipeableView`. Páginas NÃO criam scroll próprio.

**Props:** `children`, `className?`, `maxWidth?: 'sm'|'md'|'lg'|'xl'|'2xl'|'full'`, `spacing?: 4|6|8`.

**Verificação:**
- `npm run check:page-content` (prebuild + CI): warn para PENDING_MIGRATION, hard-fail para páginas novas.
- `npm run check:page-content -- --strict`: falha se qualquer autenticada não usar `PageContent`. Promover quando lista vazia.
- Runtime: `mobileNavGuard` (DEV) detecta scroll containers próprios sem padding mobile.
- Visual: `npm run test:mobile-nav-visual` (16 rotas).

**Standalone allowlist:** `Auth`, `AuthCallback`, `ResetPasswordPage`, `NotFound`, `AcessoNegado`, `CoveragePage`, `Index`.

**Doc:** `docs/PAGE_CONTENT_STANDARD.md`.
