---
name: mobile-nav-multi-viewport-theme
description: Spec captura snapshots full-page+bottom-strip de 4 rotas críticas em 3 viewports × 2 temas (light/dark) — 48 baselines para detectar regressões visuais cross-theme que afetem o layout
type: feature
---
**Spec:** `tests/e2e/mobile-nav-multi-viewport-theme.spec.ts`
**Scripts:** `npm run test:mobile-nav-multi-viewport-theme` / `:update`.

**Matriz:**
- Viewports: `mobile-small` (360×640), `mobile-large` (414×896), `tablet-portrait` (768×1024).
- Temas: `light`, `dark`.
- Rotas: `/`, `/dashboard`, `/heatmap`, `/analytics`.
- Variantes por test: `fullpage` + `bottom-strip` (200px) → **48 baselines** (4 × 3 × 2 × 2).

**Mecânica de tema:**
- `page.addInitScript` injeta `localStorage.setItem('visao-theme', JSON.stringify({ mode, variant: 'default' }))` antes do primeiro paint.
- Pré-aplica `document.documentElement.classList.add(mode)` para evitar flash do default (`dark`).
- `waitForFunction` confirma a classe aplicada após Provider inicializar (defesa contra race).

**Naming (via `snapshotName`):**
`__screenshots__/mobile-nav-multi-viewport-theme/mobile-safari/<route>/<variant>@<viewport-name>-<theme>.png`
Exemplo: `dashboard/fullpage@mobile-small-light.png`.

**Diferencial vs `mobile-nav-visual.spec.ts`:** aquele varre 18 rotas em 1 viewport × 1 tema (dark). Este foca em 4 rotas mas amplia para 6 combinações viewport×theme — captura regressões como sombras invertidas, badges com peso de fonte diferente, bordas de 1px só no light, ou alturas de header divergentes que empurram conteúdo sob a nav.

**Atualização de baselines:** `npm run test:mobile-nav-multi-viewport-theme:update` (preferencialmente em CI Linux para baseline estável).
