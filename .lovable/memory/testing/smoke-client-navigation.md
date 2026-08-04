---
name: smoke-client-navigation
description: smoke-client-navigation.spec.ts valida navegação SPA Dashboard→Heatmap→Analytics clicando nos links reais da Sidebar/BottomNav, detecta hard reloads acidentais
type: feature
---

**Arquivo:** `tests/e2e/smoke-client-navigation.spec.ts`

**Objetivo:** complementa `smoke-pages.spec.ts` validando TRANSIÇÕES (não páginas isoladas). Detecta:

- Links quebrados após refactor de rotas
- Uso acidental de `<a href>` em vez de `<Link>` (hard reload)
- ProtectedRoute mal configurado em rota intermediária
- SectionErrorBoundary disparando em transições

**Fluxo testado:** `/dashboard` → clica "Calor" → `/heatmap` → clica "Analytics" → `/analytics`.

**Estratégia de seleção de link (camadas):**

1. `[data-testid="nav-{id}"]` (preferencial — `nav-heatmap`, `nav-analytics`)
2. `nav, aside, [role="navigation"]` + `a[href="{path}"]`
3. Fallback por texto do label (regex case-insensitive)

**Detecção de hard reload:**

- Sentinel `window.__spaSentinel` definido antes do click; após `waitForURL`, valida que persistiu (sobreviveu = SPA, sumiu = reload).
- Contador de `framenavigated` complementar com tolerância (pushState/replaceState contam).

**Cobertura responsiva:** desktop (Sidebar) + mobile (BottomNavigation via iPhone 12).

**Auth:** usa `gotoAuthenticated` — auto-skip se sem sessão (mesmo padrão dos outros smokes).

**Recomendação:** adicionar `data-testid="nav-heatmap"` e `data-testid="nav-analytics"` aos links da Sidebar/BottomNav para estabilizar o teste contra mudanças de label.
