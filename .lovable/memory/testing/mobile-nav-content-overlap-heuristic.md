---
name: mobile-nav-content-overlap-heuristic
description: Spec Playwright que detecta sobreposição geométrica real entre conteúdo interativo/textual e BottomNav em 10 rotas mobile críticas, complementando padding/snapshot/class-presence
type: feature
---
**Arquivo:** `tests/e2e/mobile-nav-content-overlap.spec.ts` — `npm run test:mobile-nav-content-overlap`.

**Diferencial vs outras camadas mobile-nav:**
- `mobile-nav-padding.spec.ts` mede `paddingBottom` computado (proxy estático).
- `mobile-nav-overlap.spec.ts` faz snapshot visual da faixa inferior (regressão pixel).
- `mobile-nav-class-presence.spec.ts` valida classe `mb-mobile-nav` no DOM.
- **Este novo spec** faz varredura geométrica de TODOS os elementos visíveis (interativos + texto significativo) e detecta `rect.bottom > navTop` — captura casos onde padding está aplicado mas um filho com `position:absolute`, `transform`, ou `margin negativo` ultrapassa a barreira.

**Algoritmo:**
1. Localiza BottomNav via `[data-bottom-nav]` ou `nav` com `position:fixed/sticky` e `bottom >= viewport - 8`.
2. Scrolla até o fim (`scrollTop = scrollHeight`).
3. Coleta candidatos: `button, a[href], input, select, textarea, [role=...], [tabindex≥0], h1-h3, p, li, td, [data-card]`.
4. Para cada um visível dentro do viewport: flag se `bottom > navTop + 4px` E `top < navTop`.
5. Falha listando primeiros 5 sobrepostos com seletor + texto + overlapPx.

**Cobertura:** 10 rotas críticas (`/dashboard`, `/cameras`, `/alerts`, `/heatmap`, `/analytics`, `/recordings`, `/people`, `/license-plate`, `/zones`, `/settings`).

**Tolerância:** 4px para arredondamento subpixel + sombras CSS.

**Comportamento sem auth:** usa `gotoAuthenticated` — se não houver sessão, faz skip controlado (cobertura estática garante o contrato).

**Quando falha:** mensagem estruturada com `navTop`, `scanned count`, e amostra dos 5 primeiros culpados (tag, texto, seletor curto, overlapPx). Permite identificar elemento específico a corrigir sem inspecionar DOM manualmente.
