/**
 * Smoke tests — páginas principais (DashboardV2, Heatmap, Analytics).
 *
 * Validações rasas mas críticas:
 *   1. Sem erros no console (com allowlist mínima de ruído).
 *   2. Sem respostas 5xx em chamadas de rede.
 *   3. Layout autenticado montou ([data-app-scroll]).
 *   4. <h1> com título da página presente.
 *   5. Nenhum SectionErrorBoundary disparou.
 *   6. **Snapshots visuais mínimos** — duas regiões críticas (heading + área
 *      do gráfico/conteúdo principal) capturadas e comparadas com baseline.
 *      Detecta regressões de layout (margem/padding/tipografia) que escapam
 *      a checagens por seletor. Áreas pequenas + tolerância generosa para
 *      evitar flakes; elementos com `data-dynamic` são mascarados.
 *
 * Cobertura responsiva: cada página é testada em desktop (1280×720) e
 * mobile (iPhone 12, 390×844).
 *
 * Atualizar baselines após mudança visual intencional:
 *   npx playwright test smoke-pages --update-snapshots
 */
import { existsSync } from 'node:fs';
import { devices, type Locator, type Page } from '@playwright/test';
import { test, expect } from './helpers/testFixtures';
import { gotoAuthenticated } from './helpers/authSession';

const PAGES: Array<{
  path: string;
  name: string;
  heading: RegExp;
  /** Seletores candidatos para a "área do gráfico/conteúdo principal".
   * Tentados em ordem; o primeiro visível é capturado. Se nenhum existir,
   * o snapshot do gráfico é pulado (heading snapshot ainda roda). */
  chartSelectors: string[];
}> = [
  {
    path: '/dashboard',
    name: 'DashboardV2',
    heading: /dashboard/i,
    chartSelectors: [
      '[data-testid="dashboard-charts"]',
      '.recharts-wrapper',
      'main section:has(svg)',
    ],
  },
  {
    path: '/heatmap',
    name: 'Heatmap',
    heading: /mapa de calor/i,
    chartSelectors: ['[data-testid="heatmap-canvas"]', 'canvas', '.recharts-wrapper'],
  },
  {
    path: '/analytics',
    name: 'Analytics',
    heading: /analytics|análise/i,
    chartSelectors: [
      '[data-testid="analytics-charts"]',
      '.recharts-wrapper',
      'main section:has(svg)',
    ],
  },
];

// devices['iPhone 12'] includes defaultBrowserType which cannot be used inside
// test.describe — strip it so test.use() is valid at the describe level.
const { defaultBrowserType: _dbt, ...iphone12Config } = devices['iPhone 12'];
const VIEWPORTS = [
  { name: 'desktop', config: { viewport: { width: 1280, height: 720 } } },
  { name: 'mobile', config: iphone12Config },
];

const CONSOLE_IGNORE = [
  /\[vite\]/i,
  /Download the React DevTools/i,
  /Lovable/i,
  /Failed to load resource.*favicon/i,
];

/** Tolerâncias generosas — smoke prioriza detectar regressões estruturais
 * (deslocamento, sumiço de container), não pixel-perfect. */
const SNAPSHOT_OPTS = {
  maxDiffPixelRatio: 0.05,
  threshold: 0.25,
  animations: 'disabled' as const,
};

/** Habilita comparação visual. Em CI sem baselines, defina `SMOKE_VISUAL=0`
 * para pular apenas a parte visual sem afetar as outras asserções. */
const VISUAL_ENABLED = process.env.SMOKE_VISUAL !== '0';

/** Retorna o primeiro Locator visível da lista, ou null se nenhum match. */
async function findFirstVisible(page: Page, selectors: string[]): Promise<Locator | null> {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if (await loc.isVisible().catch(() => false)) return loc;
  }
  return null;
}

/** Captura snapshot de um locator com mascaramento de elementos dinâmicos. */
async function snapshotRegion(page: Page, locator: Locator, name: string): Promise<void> {
  // Garante que o elemento está estável antes de capturar
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(150); // micro-stabilize após scroll
  const ti = test.info();
  const missingBaselines = [`${name}`].filter(
    (n) => !existsSync(ti.snapshotPath(n, { kind: 'screenshot' }))
  );
  if (process.env.CI && missingBaselines.length > 0) {
    ti.annotations.push({ type: 'baseline-ausente', description: 'Snapshot nao executado no CI: sem baseline para ' + missingBaselines.join(', ') });
    return;
  }
  await expect(locator).toHaveScreenshot(name, {
    ...SNAPSHOT_OPTS,
    mask: [page.locator('[data-dynamic]')],
  });
}

for (const vp of VIEWPORTS) {
  test.describe(`Smoke (${vp.name})`, () => {
    test.use(vp.config);

    for (const target of PAGES) {
      test(`${target.name} carrega sem erros`, async ({ page }) => {
        const consoleErrors: string[] = [];
        const networkErrors: string[] = [];

        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            const text = msg.text();
            if (!CONSOLE_IGNORE.some((rx) => rx.test(text))) {
              consoleErrors.push(text);
            }
          }
        });
        page.on('response', (resp) => {
          if (resp.status() >= 500) {
            networkErrors.push(`${resp.status()} ${resp.url()}`);
          }
        });

        // Navegação autenticada (auto-skip se sem sessão)
        const ready = await gotoAuthenticated(page, target.path, {
          waitUntil: 'domcontentloaded',
        });
        if (!ready) return;

        await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {
          // OK: páginas com subscriptions realtime nunca atingem networkidle
        });

        // 1. Layout autenticado montou
        await expect(page.locator('[data-app-scroll]')).toBeVisible({ timeout: 10000 });

        // 2. Heading principal presente
        const h1 = page.locator('h1').first();
        await expect(h1).toContainText(target.heading);

        // 3. Nenhum SectionErrorBoundary disparou
        await expect(page.getByText(/algo deu errado|erro ao carregar/i)).toHaveCount(0);

        // 4. Snapshots visuais mínimos (heading + chart area)
        if (VISUAL_ENABLED) {
          // Snapshot 1: cabeçalho — captura o container do <h1> para incluir
          // qualquer ação/breadcrumb adjacente. Detecta regressões de tipografia,
          // alinhamento e badges de status.
          const headerRegion = page
            .locator('header, [data-page-header], main > div:has(h1)')
            .first();
          const headerTarget = (await headerRegion.isVisible().catch(() => false))
            ? headerRegion
            : h1;
          await snapshotRegion(page, headerTarget, `${target.name}-${vp.name}-header.png`);

          // Snapshot 2: área do gráfico/conteúdo principal — best-effort.
          // Pula se não encontrar para não bloquear smoke em páginas que
          // ainda não expõem `data-testid`.
          const chart = await findFirstVisible(page, target.chartSelectors);
          if (chart) {
            await snapshotRegion(page, chart, `${target.name}-${vp.name}-chart.png`);
          } else {
            test.info().annotations.push({
              type: 'visual-skipped',
              description: `Nenhum seletor de gráfico visível em ${target.path} — adicione data-testid para cobertura completa`,
            });
          }
        }

        // 5. Sem erros JS / rede
        expect(
          consoleErrors,
          `Console errors em ${target.path}:\n${consoleErrors.join('\n')}`
        ).toHaveLength(0);
        expect(
          networkErrors,
          `Network 5xx em ${target.path}:\n${networkErrors.join('\n')}`
        ).toHaveLength(0);
      });
    }
  });
}
