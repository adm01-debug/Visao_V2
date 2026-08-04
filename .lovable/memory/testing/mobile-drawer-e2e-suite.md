---
name: mobile-drawer-e2e-suite
description: Spec Playwright iPhone 12 que valida abertura/fechamento do drawer da BottomNavigation, navegação entre categorias, fechamento via overlay/X/item, e geometria drawer-acima-da-nav
type: feature
---

**Arquivo:** `tests/e2e/mobile-drawer.spec.ts` — `npm run test:mobile-drawer`.

**Comportamento da BottomNavigation (referência: `src/components/BottomNavigation.tsx`):**

- NÃO tem hamburger global; o "drawer" é um painel inferior que expande quando o usuário toca uma categoria **já ativa** (toggle).
- Tap em categoria não-ativa → navega para `defaultPath` SEM abrir drawer.
- Tap em categoria ativa → abre drawer com itens daquela categoria.
- Re-tap fecha; overlay (backdrop blur) e botão X também fecham.
- Tap em item do drawer → navega + fecha automaticamente.

**Cenários cobertos (7 testes):**

1. Toggle abre/fecha drawer da categoria ativa (Monitor em `/dashboard`).
2. Tap em categoria diferente navega sem abrir drawer.
3. Overlay/backdrop fecha drawer.
4. Botão X fecha drawer.
5. Item do drawer navega e fecha drawer.
6. Trocar de categoria com drawer aberto mantém estado consistente.
7. Geometria: `drawer.bottom <= nav.top` (drawer fica acima da nav, não cobre tátil).

**Auth:** usa `gotoAuthenticated` — sem sessão, faz `test.skip` controlado (drawer só existe em rotas auth com MainLayout).

**Seletores estáveis:**

- BottomNav: `nav[aria-label="Navegação principal mobile"]`
- Categoria: `button[aria-label^="<Label>"]` (ex: "Monitor", "Intel", "Segurança")
- Drawer: `div.fixed.bottom-16` (painel ancorado acima da nav 60px)
- Overlay: `div.fixed.inset-0.bg-background/80`
