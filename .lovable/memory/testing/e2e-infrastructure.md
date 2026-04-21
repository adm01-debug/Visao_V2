---
name: e2e-infrastructure
description: Playwright E2E suites + QA manual doc — auth, mobile-nav padding/overlap, smoke tests, plus docs/QA-MANUAL-RESPONSIVIDADE.md snapshot covering authenticated routes and mobile menu
type: feature
---
**Suítes Playwright (`tests/e2e/`):**

- `auth.spec.ts` — login/signup, RBAC (`/users` admin-only), redirects.
- `smoke-pages.spec.ts` — smoke das 3 páginas críticas (DashboardV2, HeatmapPage, AnalyticsPage) em desktop + mobile; valida render sem console errors e sem 4xx/5xx de rede.
- `mobile-nav-padding.spec.ts` — viewport iPhone 12, ~15 rotas autenticadas, mede `paddingBottom` real do último filho de `[data-app-scroll]` ≥ 64px.
- `mobile-nav-overlap.spec.ts` — snapshot visual da faixa inferior em `/dashboard`, `/heatmap`, `/analytics`; valida `bottom <= viewportHeight - 60`.
- `navigation.spec.ts`, `accessibility.spec.ts`, `critical-paths.spec.ts`, `performance.spec.ts` — cobertura adicional.

**Scripts npm:** `test:smoke`, `test:mobile-nav-runtime`, `test:mobile-nav-overlap`, `test:e2e`.

**QA manual versionado:** `docs/QA-MANUAL-RESPONSIVIDADE.md` consolida validação humana de:
- 12 rotas autenticadas (matriz completa com cobertura E2E equivalente)
- 8 critérios do menu mobile (hamburger, drawer, BottomNav, mb-mobile-nav, Cmd+K)
- 6 páginas standalone (sem MainLayout/BottomNav)

O doc é **snapshot pontual** — não rodar QA manual periodicamente; os E2E + `scripts/check-mobile-nav.mjs` (prebuild + CI) são a fonte de verdade contínua. Atualizar apenas após mudanças significativas em layouts/responsividade. Referência cruzada em `docs/LAYOUTS.md` §11.

**Gates estritos (CI + pre-push):** `type-check:strict`, `lint:ci` (zero warnings), `build`, `check:bundle-size` (chunks ≤ 600 kB raw / 200 kB gz, total ≤ 2 MB raw / 700 kB gz).
