/**
 * VISÃO - Runtime check: mobile nav padding
 *
 * Garante que toda rota autenticada renderiza o conteúdo com padding inferior
 * suficiente para não ser ocultado pela BottomNavigation no mobile.
 *
 * Estratégia:
 * 1. Viewport mobile (iPhone 12: 390×844).
 * 2. Para cada rota, verifica `[data-app-scroll]` → último filho → paddingBottom ≥ 64px.
 * 3. Se a rota redirecionar para /auth (sem credenciais seedadas), o caso é marcado
 *    como skipped — o teste estático já garante a presença da classe no código.
 *
 * Para rodar isolado: `npm run test:mobile-nav-runtime`.
 */
import { test, expect, devices } from '@playwright/test';

const ROUTES = [
  '/dashboard',
  '/cameras',
  '/alerts',
  '/heatmap',
  '/analytics',
  '/settings',
  '/telegram',
  '/users',
  '/license-plates',
  '/face-recognition',
  '/productivity',
  '/journey-reports',
  '/panic-events',
  '/behavior-detection',
  '/admin/telemetria',
];

const MIN_PADDING_PX = 64; // 4rem

test.use({ ...devices['iPhone 12'] });

test.describe('Mobile nav padding (runtime)', () => {
  for (const route of ROUTES) {
    test(`${route} aplica padding-bottom ≥ ${MIN_PADDING_PX}px`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      // Se redirecionou para auth (sem login seedado em CI), pular sem falhar.
      const url = page.url();
      if (/\/(auth|login)(\?|$|\/)/.test(url)) {
        test.skip(true, `Rota ${route} requer autenticação — coberta pela checagem estática.`);
        return;
      }
      // Aguarda o layout autenticado montar
      await page.waitForSelector('[data-app-scroll]', { timeout: 10000 }).catch(() => {});

      const result = await page.evaluate(() => {
        const scroll = document.querySelector('[data-app-scroll]');
        if (!scroll) return { ok: false, reason: 'no-data-app-scroll', padding: 0 };
        const last = scroll.lastElementChild as HTMLElement | null;
        if (!last) return { ok: false, reason: 'no-last-child', padding: 0 };
        const padding = parseFloat(getComputedStyle(last).paddingBottom);
        return { ok: padding >= 64, reason: 'measured', padding };
      });

      expect(result.padding, `padding-bottom medido em ${route} (motivo: ${result.reason})`).toBeGreaterThanOrEqual(
        MIN_PADDING_PX
      );
    });
  }
});
