---
name: smoke-a11y-mobile
description: smoke-a11y-mobile.spec.ts faz auditoria leve de a11y (landmarks, ARIA básico, BottomNav acessível) em mobile sem dependência de axe-core
type: feature
---
**Arquivo:** `tests/e2e/smoke-a11y-mobile.spec.ts` (apenas viewport iPhone 12).

**Checagens (smoke ≠ auditoria completa):**
1. **Landmarks:** exatamente 1 `<main>`, ≥1 `<nav>` visível.
2. **Heading:** exatamente 1 `<h1>` por página.
3. **ARIA básico (custom, sem axe-core):**
   - `aria-labelledby`/`aria-describedby` apontam para IDs existentes
   - `role` válido (whitelist WAI-ARIA com 60+ roles)
   - `aria-hidden="true"` não envolve elementos focáveis
   - Botões/links visíveis têm nome acessível (text/aria-label/aria-labelledby/title)
4. **BottomNavigation:**
   - `aria-current="page"` no item ativo (warning se ausente, não falha)
   - Sem `tabindex="-1"` em itens (FALHA se presente)
   - Touch targets ≥ 44×44px (WCAG 2.5.5)

**Páginas cobertas:** /dashboard, /heatmap, /analytics.

**Por que não axe-core:** evita nova dependência (`@axe-core/playwright` ~2MB). As checagens custom cobrem 80% das regressões mais comuns em refactors mobile.

**Auth:** usa `gotoAuthenticated` — auto-skip sem sessão.

**Anexos em falha:** vem da fixture `testFixtures.ts` (console + network + screenshot + URL).

**Execução:** `npx playwright test smoke-a11y-mobile --project=mobile-safari`.
