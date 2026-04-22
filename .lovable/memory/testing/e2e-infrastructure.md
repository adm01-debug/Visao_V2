---
name: e2e-infrastructure
description: Playwright E2E suites + QA manual doc — auth, mobile-nav padding/overlap/class/content-overlap, mobile-drawer, smoke + qa-visual-snapshots; QA manual cobre rotas auth e menu mobile com matriz E2E equivalente
type: feature
---
**Suítes Playwright (`tests/e2e/`):**

- `auth.spec.ts` — login/signup, RBAC (`/users` admin-only), redirects.
- `smoke-pages.spec.ts` — smoke das 3 páginas críticas (DashboardV2, HeatmapPage, AnalyticsPage) em desktop + mobile; valida render sem console errors e sem 4xx/5xx de rede.
- `smoke-a11y-mobile.spec.ts` — landmarks, headings, ARIA e touch targets ≥ 44px em mobile.
- `mobile-nav-padding.spec.ts` — paddingBottom ≥ 64px em ~15 rotas autenticadas (iPhone 12).
- `mobile-nav-overlap.spec.ts` — snapshot visual faixa inferior em /dashboard, /heatmap, /analytics × 3 viewports.
- `mobile-nav-class-presence.spec.ts` — gate literal de `mb-mobile-nav` no DOM em 21 rotas.
- `mobile-nav-content-overlap.spec.ts` — varredura geométrica de elementos interativos vs BottomNav top em 10 rotas.
- `mobile-drawer.spec.ts` — 7 cenários iPhone 12: toggle, navegação por categoria, overlay/X/item fecham, geometria drawer-acima-da-nav.
- `qa-visual-snapshots.spec.ts` — captura desktop+mobile+drawer de 15 rotas → relatório HTML auto-contido (`scripts/build-qa-screenshots-report.mjs`).
- `navigation.spec.ts`, `accessibility.spec.ts`, `critical-paths.spec.ts`, `performance.spec.ts` — cobertura adicional.

**Scripts npm:** `test:smoke`, `test:mobile-nav-runtime`, `test:mobile-nav-overlap`, `test:mobile-nav-class`, `test:mobile-nav-content-overlap`, `test:mobile-drawer`, `qa:visual-snapshots`, `report:qa-screenshots`, `test:e2e`.

**QA manual versionado:** `docs/QA-MANUAL-RESPONSIVIDADE.md` — snapshot pontual da validação humana (12 rotas auth + 8 critérios mobile + 6 standalone). Inclui §7.0 (verificação obrigatória de sessão), §6 (matriz de cobertura E2E equivalente) e histórico de execuções com estado de sessão. Última tentativa de re-execução ao vivo (2026-04-22) bloqueada por preview proxy 502 — mitigação documentada (E2E + estática + checklist de release). Referência cruzada em `docs/LAYOUTS.md` §11.

**Checklist de release:** `docs/RELEASE-REGRESSION-CHECKLIST.md` — checklist enxuto (≤5 min) com critério PASS/FAIL para aprovação de release.

**Política:** o doc QA é **snapshot pontual** — não rodar manualmente em cada release; usar checklist + suítes E2E. Atualizar QA manual apenas após mudanças significativas em layout/responsividade ou quando preview ao vivo retornar problemas.

**Gates estritos (CI + pre-push):** `type-check:strict`, `lint:ci` (zero warnings), `build`, `check:bundle-size` (chunks ≤ 600 kB raw / 200 kB gz, total ≤ 2 MB raw / 700 kB gz), `check:mobile-nav` (prebuild — 8 camadas).
