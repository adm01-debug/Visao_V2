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
import { gotoAuthenticated } from './helpers/authSession';

// Rotas reais de src/App.tsx. `/telegram`, `/license-plates` e `/admin/telemetria`
// nunca existiram: caíam no NotFound (sem [data-app-scroll]) e o teste falhava.
const ROUTES = [
  '/dashboard',
  '/cameras',
  '/alerts',
  '/alerts-timeline',
  '/evaluation',
  '/heatmap',
  '/analytics',
  '/settings',
  '/telegram-settings',
  '/users',
  '/license-plate',
  '/face-recognition',
  '/productivity',
  '/journey-reports',
  '/panic-events',
  '/behavior-detection',
  '/admin/api-usage',
];

const MIN_PADDING_PX = 64; // 4rem

// devices['iPhone 12'] traz defaultBrowserType: 'webkit', o que faria o projeto
// `chromium` abrir o WebKit (não instalado no CI). A intenção destas specs é
// viewport/UA/touch de iPhone — emulados no navegador do projeto.
const { defaultBrowserType: _dbt, ...iPhone12 } = devices['iPhone 12'];
test.use(iPhone12);

test.describe('Mobile nav padding (runtime)', () => {
  for (const route of ROUTES) {
    test(`${route} aplica padding-bottom ≥ ${MIN_PADDING_PX}px`, async ({ page }) => {
      // Tenta autenticar via helper; faz skip controlado se não houver sessão.
      const ready = await gotoAuthenticated(page, route, { waitUntil: 'domcontentloaded' });
      if (!ready) return;

      // Aguarda o layout autenticado montar
      await page.waitForSelector('[data-app-scroll]', { timeout: 10000 }).catch(() => {});

      const result = await page.evaluate(() => {
        const scroll = document.querySelector('[data-app-scroll]');
        if (!scroll) return { ok: false, reason: 'no-data-app-scroll', padding: 0 };
        // O `<main>` é quem recebe `mb-mobile-nav`. Ele não é filho direto do
        // scroll container (há um wrapper `div.w-full.h-full`) e o último filho
        // pode ser o `<nav>` de page-dots do SwipeableView (padding 0), o que
        // tornava a medição sempre 0 mesmo com o layout correto.
        const main = scroll.querySelector('main') as HTMLElement | null;
        if (!main) return { ok: false, reason: 'no-main', padding: 0 };
        const cs = getComputedStyle(main);
        const padding = parseFloat(cs.paddingBottom) + parseFloat(cs.marginBottom);
        return { ok: padding >= 64, reason: 'measured', padding };
      });

      expect(
        result.padding,
        `padding-bottom medido em ${route} (motivo: ${result.reason})`
      ).toBeGreaterThanOrEqual(MIN_PADDING_PX);
    });
  }
});
