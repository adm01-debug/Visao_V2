---
name: qa-visual-screenshot-suite
description: Suite que captura screenshots desktop+mobile+drawer de 15 rotas (auth+standalone) e gera relatório HTML auto-contido para QA manual offline
type: feature
---
**Componentes:**
- `tests/e2e/qa-visual-snapshots.spec.ts` — Playwright spec que captura screenshots full-page desktop (1280×720) + mobile (iPhone 12) de 15 rotas (11 auth + 4 standalone). Em rotas autenticadas marcadas com `captureDrawer: true` (Dashboard, Heatmap, Analytics), também abre o hamburger mobile e captura `*-drawer.png`.
- `scripts/build-qa-screenshots-report.mjs` — gera `qa-screenshots/index.html` auto-contido (base64 inline) com grid lado-a-lado, badges de classificação (AUTH vs STANDALONE) e sumário navegável.

**Scripts npm:**
- `npm run qa:visual-snapshots` — `playwright test qa-visual-snapshots --project=chromium`
- `npm run report:qa-screenshots` — gera o HTML

**Saída:** `qa-screenshots/{desktop,mobile}/*.png` + `qa-screenshots/index.html`.

**Tipos de validação visual cobertos:**
- Auth mobile: hamburger topo + BottomNav rodapé
- Auth mobile + drawer: Sheet lateral aberto com categorias
- Auth desktop: Sidebar persistente
- Standalone: AUSÊNCIA de chrome em /auth, /acesso-negado, /reset-password, /404

**Comportamento sem auth:** rotas autenticadas viram screenshot da tela `/auth` com annotation `auth-redirect`; relatório não falha mas exibe a captura realista (útil para validar próprio fluxo de redirect).

**Integração com QA manual:** referenciado no §7.2 de `docs/QA-MANUAL-RESPONSIVIDADE.md` como atalho automatizado preferencial. Relatório HTML é portável (base64), pode ser enviado por e-mail/Slack para revisão humana assíncrona.

**Não roda em CI** (custo alto + screenshots grandes); é ferramenta para QA on-demand. CI continua usando smoke-pages/mobile-nav-overlap para regressões.
