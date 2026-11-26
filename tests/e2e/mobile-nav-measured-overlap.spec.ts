/**
 * VISÃO - Mobile Nav: overlap baseado em altura MEDIDA dinamicamente.
 *
 * Diferencial vs outras camadas mobile-nav:
 *  - `mobile-nav-padding.spec.ts` valida `padding-bottom ≥ 64px` (constante).
 *  - `mobile-nav-overlap.spec.ts` usa `expectLastRealElementAboveNav(page, 60)`.
 *  - **Este spec** mede `getBoundingClientRect()` da BottomNav em runtime e
 *    valida overlap contra essa altura — captura regressões em altura/safe-area
 *    sem precisar atualizar valor fixo nos testes.
 *
 * Cobre as 12 rotas autenticadas críticas em viewport iPhone 12 (390×844).
 *
 * Rodar isolado:  npx playwright test mobile-nav-measured-overlap
 */
import { test, expect, devices } from '@playwright/test';
import { gotoAuthenticated } from './helpers/authSession';
import { measureBottomNav, assertNoOverlapWithMeasuredNav } from './helpers/measureBottomNav';

const ROUTES = [
  '/dashboard',
  '/cameras',
  '/alerts',
  '/alerts-timeline',
  '/evaluation',
  '/heatmap',
  '/analytics',
  '/recordings',
  '/people',
  '/license-plate',
  '/zones',
  '/settings',
] as const;

// devices['iPhone 12'] traz defaultBrowserType: 'webkit', o que faria o projeto
// `chromium` abrir o WebKit (não instalado no CI). A intenção destas specs é
// viewport/UA/touch de iPhone — emulados no navegador do projeto.
const { defaultBrowserType: _dbt, ...iPhone12 } = devices['iPhone 12'];
test.use(iPhone12);

test.describe('Mobile nav — overlap com altura medida dinamicamente', () => {
  test('BottomNav é mensurável e tem altura coerente em /dashboard', async ({ page }) => {
    const ready = await gotoAuthenticated(page, '/dashboard', { waitUntil: 'domcontentloaded' });
    if (!ready) test.skip(true, 'Sessão indisponível — cobertura estática garante o contrato.');

    await page.waitForSelector('[data-app-scroll]', { timeout: 10_000 }).catch(() => {});
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    const measured = await measureBottomNav(page);
    expect(measured.found, 'BottomNav deve ser localizada por seletor canônico').toBe(true);
    // Garante que a nav está realmente colada ao rodapé
    expect(Math.abs(measured.bottomPx - measured.viewportHeight)).toBeLessThanOrEqual(2);
    // Altura precisa estar em faixa plausível (h-16=64px ± safe-area)
    expect(measured.heightPx).toBeGreaterThanOrEqual(48);
    expect(measured.heightPx).toBeLessThanOrEqual(120);
  });

  test('/cameras — o gatilho do menu não cobre o botão Voltar', async ({ page }) => {
    const ready = await gotoAuthenticated(page, '/cameras', { waitUntil: 'domcontentloaded' });
    if (!ready) test.skip(true, 'Sessão indisponível — cobertura estática garante o contrato.');

    const back = page.getByRole('button', { name: /voltar para a tela anterior/i });
    await expect(back).toBeVisible();

    // O gatilho do menu é `fixed top-4 left-4` e abria exatamente sobre a seta:
    // `elementFromPoint` no centro devolvia o gatilho, então o toque abria o
    // menu em vez de voltar. É o contrato que impede a regressão.
    const hitsBackButton = await back.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return Boolean(hit && (el === hit || el.contains(hit)));
    });
    expect(hitsBackButton).toBe(true);
  });

  for (const route of ROUTES) {
    test(`${route} — último elemento acima da BottomNav (altura medida)`, async ({ page }) => {
      const ready = await gotoAuthenticated(page, route, { waitUntil: 'domcontentloaded' });
      if (!ready) {
        test.skip(
          true,
          `Sessão indisponível para ${route} — cobertura estática garante o contrato.`
        );
        return;
      }

      await page.waitForSelector('[data-app-scroll]', { timeout: 10_000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded').catch(() => {});

      // Aguarda skeletons sumirem (heurística leve)
      await page
        .waitForFunction(
          () => document.querySelectorAll('[data-skeleton], .animate-pulse').length === 0,
          undefined,
          { timeout: 5_000 }
        )
        .catch(() => {});

      // Scroll até o fim — força aparecer o último elemento real
      await page.evaluate(() => {
        const el = document.querySelector('[data-app-scroll]') as HTMLElement | null;
        if (el) el.scrollTop = el.scrollHeight;
      });
      await page.waitForTimeout(300);

      const result = await assertNoOverlapWithMeasuredNav(page, {
        tolerancePx: 4,
        routeLabel: route,
      });

      // Sanity log no relatório do Playwright (visível em --reporter=list)
      test.info().annotations.push({
        type: 'measurement',
        description: `${route}: navHeight=${result.navHeight.toFixed(1)}px, lastBottom=${result.lastBottom.toFixed(1)}px`,
      });
    });
  }
});
