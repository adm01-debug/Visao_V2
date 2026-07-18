/**
 * Onda 61 — Axe-core E2E em rotas críticas.
 *
 * Executa axe-core em cada rota autenticada crítica e falha se houver
 * violações de severidade `critical` ou `serious` (WCAG 2.1 A/AA).
 *
 * Rotas com violações `moderate`/`minor` são reportadas mas não bloqueiam
 * o CI (evita ruído durante estabilização).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const CRITICAL_ROUTES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/cameras', name: 'Câmeras' },
  { path: '/alerts', name: 'Alertas' },
  { path: '/people', name: 'Pessoas' },
  { path: '/settings', name: 'Configurações' },
];

test.describe('A11y (axe-core) — rotas críticas', () => {
  for (const route of CRITICAL_ROUTES) {
    test(`${route.name} (${route.path}) sem violações critical/serious`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      // aguarda hidratação leve
      await page.waitForTimeout(500);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      if (blocking.length > 0) {
        // eslint-disable-next-line no-console -- test diagnostic output
        console.error(
          `[a11y] ${route.name}:`,
          JSON.stringify(
            blocking.map((v) => ({
              id: v.id,
              impact: v.impact,
              nodes: v.nodes.length,
              help: v.helpUrl,
            })),
            null,
            2
          )
        );
      }
      expect(blocking, 'Violações WCAG críticas/severas encontradas').toEqual([]);
    });
  }
});
