---
name: smoke-visual-snapshots
description: smoke-pages.spec.ts captura snapshots visuais mínimos (heading + área do gráfico) em desktop+mobile para DashboardV2/Heatmap/Analytics — detecta regressões de layout sem depender só de seletores
type: feature
---
**Arquivo:** `tests/e2e/smoke-pages.spec.ts`

**Snapshots por teste (3 páginas × 2 viewports = 12 cases máx):**
1. **Header region** — `header, [data-page-header], main > div:has(h1)` (fallback: o próprio `h1`). Detecta regressões de tipografia, alinhamento, badges adjacentes.
2. **Chart/content area** — best-effort via lista de seletores candidatos por página:
   - Dashboard: `[data-testid="dashboard-charts"]`, `.recharts-wrapper`, `main section:has(svg)`
   - Heatmap: `[data-testid="heatmap-canvas"]`, `canvas`, `.recharts-wrapper`
   - Analytics: `[data-testid="analytics-charts"]`, `.recharts-wrapper`, `main section:has(svg)`
   - Se nenhum seletor visível: pula apenas essa parte (annotation `visual-skipped`), não falha.

**Tolerâncias** (smoke ≠ pixel-perfect):
- `maxDiffPixelRatio: 0.05` (5%)
- `threshold: 0.25` por pixel
- `animations: 'disabled'`
- Mascarar `[data-dynamic]` (timestamps, contadores realtime)

**Baselines:** `tests/e2e/smoke-pages.spec.ts-snapshots/` — versionados.
**Atualizar:** `npx playwright test smoke-pages --update-snapshots`.
**Skip total visual:** `SMOKE_VISUAL=0` (mantém asserções não-visuais).
**Auth:** usa `gotoAuthenticated` (helper centralizado) — auto-skip se sem sessão.

**Nomenclatura snapshots:** `${pageName}-${viewport}-{header|chart}.png` (ex.: `DashboardV2-mobile-header.png`).

**Recomendação:** adicionar `data-testid="{dashboard|heatmap|analytics}-charts"` nas seções principais para cobertura visual estável (atualmente fallback usa `.recharts-wrapper`).
