/**
 * Smoke tests — páginas principais (DashboardV2, Heatmap, Analytics).
 *
 * Validações rasas mas críticas:
 *   1. Sem erros no console (com allowlist mínima de ruído).
 *   2. Sem respostas 5xx em chamadas de rede.
 *   3. Layout autenticado montou ([data-app-scroll]).
 *   4. <h1> com título da página presente.
 *   5. Nenhum SectionErrorBoundary disparou.
 *
 * Cobertura responsiva: cada página é testada em desktop (1280×720) e
 * mobile (iPhone 12, 390×844) para detectar regressões de responsividade.
 *
 * Em CI sem credenciais seedadas, rotas autenticadas redirecionam para /auth
 * e o teste é pulado explicitamente (mesmo padrão de mobile-nav-padding.spec.ts).
 */
import { test, expect, devices } from '@playwright/test';

const PAGES = [
  { path: '/dashboard', name: 'DashboardV2', heading: /dashboard/i },
  { path: '/heatmap', name: 'Heatmap', heading: /mapa de calor/i },
  { path: '/analytics', name: 'Analytics', heading: /analytics|análise/i },
];

const VIEWPORTS = [
  { name: 'desktop', config: { viewport: { width: 1280, height: 720 } } },
  { name: 'mobile', config: { ...devices['iPhone 12'] } },
];

// Ruído conhecido a ignorar (HMR, devtools, badge de preview, extensions)
const CONSOLE_IGNORE = [
  /\[vite\]/i,
  /Download the React DevTools/i,
  /Lovable/i,
  /Failed to load resource.*favicon/i,
];

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

        await page.goto(target.path, { waitUntil: 'domcontentloaded' });
        // Aguarda estabilização (sem bloquear em polling realtime indefinido)
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
          // OK: páginas com subscriptions realtime nunca atingem networkidle
        });

        // Pular se redirecionou para auth (CI sem credenciais seedadas)
        if (/\/(auth|login)/.test(page.url())) {
          test.skip(true, 'Requer autenticação — rota redirecionou para /auth');
          return;
        }

        // 1. Layout autenticado montou
        await expect(page.locator('[data-app-scroll]')).toBeVisible({ timeout: 10000 });

        // 2. Heading principal presente
        await expect(page.locator('h1').first()).toContainText(target.heading);

        // 3. Nenhum SectionErrorBoundary disparou
        await expect(page.getByText(/algo deu errado|erro ao carregar/i)).toHaveCount(0);

        // 4. Sem erros JS / rede
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
