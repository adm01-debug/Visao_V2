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
      await page.goto(route.path, { waitUntil: 'networkidle' });
      // Aguarda o conteúdo real da página (não o splash de carregamento), senão
      // em viewports menores o axe mede o placeholder e o resultado oscila.
      await page
        .waitForFunction(() => document.body.innerText.length > 500, undefined, {
          timeout: 15000,
        })
        .catch(() => undefined);
      await page.waitForTimeout(500);
      // Espera as animações de entrada do framer-motion terminarem antes de
      // medir: no meio da transição o axe compõe as cores com a opacidade
      // corrente (ex.: #544218 em vez de #e8b41f) e reporta color-contrast
      // falso. Congelar via `reducedMotion` não serve — vários componentes só
      // animam com `prefers-reduced-motion: no-preference`, então o badge fica
      // em `opacity: 0` e o axe piora. Medir o estado final é o que importa.
      await page
        .waitForFunction(
          () =>
            !document.getAnimations().some((a) => {
              const effect = (a as Animation & { effect?: KeyframeEffect }).effect;
              const el = effect?.target;
              if (!el) return false;
              // Animações infinitas (ex.: `animate-pulse` do botão de pânico)
              // nunca atingem `opacity: 1`: esperá-las esgotava os 10s em toda
              // rota. As animações de entrada, que são o alvo desta espera, são
              // finitas.
              if (effect?.getTiming().iterations === Infinity) return false;
              return getComputedStyle(el as Element).opacity !== '1';
            }),
          undefined,
          { timeout: 10000 }
        )
        .catch(() => undefined);

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
