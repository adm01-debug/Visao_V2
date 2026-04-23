---
name: mobile-nav-scroll-positions
description: E2E spec varrendo overlap da BottomNav em topo/meio/fim de scroll em 8 rotas mobile (390x844) — captura sticky/fixed/FAB/banners invisíveis para specs que só testam fim do scroll
type: feature
---
**Spec:** `tests/e2e/mobile-nav-scroll-positions.spec.ts`
**Script:** `npm run test:mobile-nav-scroll-positions` (project `mobile-safari`).

**Algoritmo por (rota × posição ∈ {top, middle, bottom}):**
1. `gotoAuthenticated(page, route, { waitUntil: 'networkidle' })` + 300ms estabilização.
2. Mede `scrollHeight` real do `[data-app-scroll]` (fallback `window`/`document.documentElement`).
3. Posiciona `scrollTop` em `0` / `Math.floor((sh - vh) / 2)` / `sh - vh` via `scrollTo({ behavior: 'instant' })`.
4. Aguarda 350ms (virtual lists, lazy renders, animações de entrada).
5. Mede `BottomNav` dinamicamente via `measureBottomNav` (helper compartilhado).
6. Coleta `button, a, input, textarea, select, [role="button"], h1-h3, p, li, td, [role="link"]` visíveis na viewport (`r.bottom > 0 && r.top < vh`, dimensões > 4px, opacidade ≥ 0.1, exclui filhos da própria nav).
7. Ordena por overlap descendente, falha listando top 5 com `(tag, text, selector, bottom, overlap)`. Tolerância 4px.

**Rotas (8):** `/dashboard`, `/cameras`, `/alerts`, `/alerts-timeline`, `/heatmap`, `/analytics`, `/recordings`, `/people` → 24 testes total.

**Diferencial vs suíte existente:** `mobile-nav-overlap` / `mobile-nav-content-overlap` / `mobile-nav-measured-overlap` testam apenas `scrollTop = scrollHeight`. Este spec captura elementos `position: sticky/fixed/absolute`, FABs e banners flutuantes que cobrem conteúdo no topo/meio mas saem da viewport no fim — falha invisível para as outras camadas.

**Mitigações:** tolerância 4px absorve subpixel; filtro `> 4px` ignora micro-elementos de virtual lists; `behavior: 'instant'` evita race com smooth scroll; skip controlado quando rota redireciona para `/auth` (retorno booleano de `gotoAuthenticated`).
