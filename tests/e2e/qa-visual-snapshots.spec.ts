/**
 * VISÃO - QA visual snapshot suite.
 *
 * Captura screenshots automáticos de TODAS as rotas (autenticadas + standalone)
 * em desktop (1280×720) e mobile (iPhone 12, 390×844). O resultado é consumido
 * por `scripts/build-qa-screenshots-report.mjs` para gerar relatório HTML
 * anexável ao `docs/QA-MANUAL-RESPONSIVIDADE.md`.
 *
 * **O que cada screenshot valida visualmente:**
 *   - Mobile (autenticada): hamburger no topo + BottomNav fixa no rodapé +
 *     conteúdo não coberto por chrome.
 *   - Mobile (standalone): AUSÊNCIA de hamburger e BottomNav.
 *   - Desktop (autenticada): Sidebar persistente à esquerda.
 *   - Desktop (standalone): conteúdo centrado, sem Sidebar.
 *
 * **Captura adicional:** em rotas autenticadas mobile, abre o drawer da
 * sidebar (clique no hamburger) e captura segundo screenshot `*-drawer.png`
 * para validar a UX do menu lateral.
 *
 * **Saída:** `qa-screenshots/{viewport}/{routeName}.png` +
 *           `qa-screenshots/{viewport}/{routeName}-drawer.png` (autenticadas mobile).
 *
 * **Execução:**
 *   ```bash
 *   E2E_TEST_EMAIL=... E2E_TEST_PASSWORD=... \\
 *     npx playwright test qa-visual-snapshots --project=chromium
 *   npm run report:qa-screenshots
 *   ```
 *
 * **Comportamento sem auth:** rotas autenticadas viram screenshot da tela
 * `/auth` (com annotation `auth-redirect`), o relatório diferencia visualmente.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { devices } from '@playwright/test';
import { test } from './helpers/testFixtures';
import { ensureAuthenticatedContext, isAuthRedirect } from './helpers/authSession';

interface RouteSpec {
  path: string;
  name: string;
  /** `auth` exige sessão; `standalone` deve renderizar sem chrome. */
  type: 'auth' | 'standalone';
  /** Captura adicional do drawer aberto em mobile (apenas autenticadas). */
  captureDrawer?: boolean;
}

const ROUTES: RouteSpec[] = [
  // Autenticadas — chrome esperado (Sidebar/Header desktop, BottomNav mobile)
  { path: '/dashboard', name: 'dashboard', type: 'auth', captureDrawer: true },
  { path: '/cameras', name: 'cameras', type: 'auth' },
  { path: '/alerts', name: 'alerts', type: 'auth' },
  { path: '/heatmap', name: 'heatmap', type: 'auth', captureDrawer: true },
  { path: '/analytics', name: 'analytics', type: 'auth', captureDrawer: true },
  { path: '/recordings', name: 'recordings', type: 'auth' },
  { path: '/people', name: 'people', type: 'auth' },
  { path: '/license-plate', name: 'license-plate', type: 'auth' },
  { path: '/settings', name: 'settings', type: 'auth' },
  { path: '/notification-settings', name: 'notification-settings', type: 'auth' },
  { path: '/zones', name: 'zones', type: 'auth' },
  // Standalone — SEM chrome esperado
  { path: '/auth', name: 'auth-page', type: 'standalone' },
  { path: '/acesso-negado', name: 'acesso-negado', type: 'standalone' },
  { path: '/reset-password', name: 'reset-password', type: 'standalone' },
  { path: '/rota-inexistente-qa', name: '404', type: 'standalone' },
];

const VIEWPORTS = [
  { name: 'desktop', config: { viewport: { width: 1280, height: 720 } } },
  { name: 'mobile', config: { ...devices['iPhone 12'] } },
];

const OUT_DIR = join(process.cwd(), 'qa-screenshots');

for (const vp of VIEWPORTS) {
  test.describe(`QA Screenshots (${vp.name})`, () => {
    test.use(vp.config);

    for (const route of ROUTES) {
      test(`${route.name}`, async ({ page }) => {
        // Cria diretório (idempotente)
        const dir = join(OUT_DIR, vp.name);
        mkdirSync(dir, { recursive: true });

        // Autentica se rota auth (best-effort, sem skip)
        if (route.type === 'auth') {
          await ensureAuthenticatedContext(page.context());
        }

        await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30000 })
          .catch(() => { /* alguns redirects podem cancelar */ });

        // Aguarda estabilização (suspense + queries iniciais)
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(400); // micro-stabilize

        // Detecta auth-redirect e anota (não falha — relatório diferencia)
        const finalUrl = page.url();
        const redirected = route.type === 'auth' && isAuthRedirect(finalUrl);
        if (redirected) {
          test.info().annotations.push({
            type: 'auth-redirect',
            description: `${route.path} redirecionou para ${finalUrl} (sem sessão)`,
          });
        }

        // Captura screenshot principal
        const mainPath = join(dir, `${route.name}.png`);
        await page.screenshot({ path: mainPath, fullPage: true });
        await test.info().attach(`${vp.name}/${route.name}.png`, {
          path: mainPath,
          contentType: 'image/png',
        });

        // Captura adicional do drawer em mobile (se aplicável e autenticado)
        if (vp.name === 'mobile' && route.captureDrawer && !redirected) {
          // Clica no hamburger (button visível com aria-label "menu" ou ícone Menu)
          const hamburger = page.locator(
            'button[aria-label*="menu" i], button:has(svg.lucide-menu)',
          ).first();
          if (await hamburger.isVisible().catch(() => false)) {
            await hamburger.click();
            await page.waitForTimeout(500); // animação do Sheet
            const drawerPath = join(dir, `${route.name}-drawer.png`);
            await page.screenshot({ path: drawerPath, fullPage: true });
            await test.info().attach(`${vp.name}/${route.name}-drawer.png`, {
              path: drawerPath,
              contentType: 'image/png',
            });
          }
        }
      });
    }
  });
}
