/**
 * VISÃO - Snapshot visual: BottomNavigation não cobre conteúdo (mobile)
 *
 * Combina asserção geométrica + snapshot visual para detectar sobreposição
 * da BottomNavigation sobre o último elemento de conteúdo nas páginas
 * principais em viewport mobile.
 *
 * Cobertura multi-viewport — roda cada página em 3 tamanhos para detectar
 * regressões específicas de cada classe de tela:
 *   - 360x740  → Android compacto (Galaxy A-series, Moto G base)
 *   - 390x844  → iPhone 12/13/14 padrão (devices['iPhone 12'])
 *   - 414x896  → iPhone XR/11/Plus (telas grandes)
 *
 * Asserções por viewport:
 *   - Geométrica via helper `findLastRealElement` (ignora skeletons/placeholders).
 *   - Screenshot: faixa inferior da viewport (170px) versus baseline,
 *     com tolerância de 5% (mitiga flakiness de fontes/recharts).
 *
 * Baselines são separados por viewport (Playwright nomeia automaticamente
 * usando o `name` do snapshot + project + OS), garantindo um arquivo PNG
 * por combinação `${page}-${viewport}-bottom.png`.
 *
 * Rotas que redirecionam para /auth são marcadas como skipped — cobertura
 * garantida pelas camadas estáticas (script + class-presence gate).
 *
 * Rodar isolado: `npm run test:mobile-nav-overlap`
 * Atualizar baselines: `npm run test:mobile-nav-overlap -- --update-snapshots`
 */
import { test, expect } from '@playwright/test';
import { expectLastRealElementAboveNav } from './helpers/lastRealElement';

const PAGES = [
  { path: '/dashboard', name: 'dashboard-v2' },
  { path: '/heatmap', name: 'heatmap' },
  { path: '/analytics', name: 'analytics' },
] as const;

/** Viewports cobertos. Cada um produz screenshot baseline próprio. */
const VIEWPORTS = [
  { name: 'android-360', width: 360, height: 740 },
  { name: 'iphone-390', width: 390, height: 844 },
  { name: 'iphone-414', width: 414, height: 896 },
] as const;

const NAV_HEIGHT = 60; // BottomNavigation efetiva (h-16 = 64px, tolerância 4px)
const CLIP_HEIGHT = 170; // faixa inferior capturada para snapshot

// User agent mobile genérico — garante media queries `@media (hover: none)` etc.
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';

test.use({
  userAgent: MOBILE_UA,
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 2,
});

test.describe('BottomNav não cobre conteúdo (multi-viewport mobile)', () => {
  for (const vp of VIEWPORTS) {
    test.describe(`viewport ${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      for (const { path, name } of PAGES) {
        test(`${name}: último conteúdo acima da BottomNav`, async ({ page }) => {
          await page.goto(path, { waitUntil: 'networkidle' }).catch(() => {});

          if (/\/(auth|login)(\?|$|\/)/.test(page.url())) {
            test.skip(
              true,
              `Rota ${path} requer autenticação — coberta pela checagem estática.`,
            );
            return;
          }

          await page.waitForSelector('[data-app-scroll]', { timeout: 10000 }).catch(() => {});

          // Scroll até o fim do scroll container do app
          await page.evaluate(() => {
            const el = document.querySelector('[data-app-scroll]') as HTMLElement | null;
            if (el) el.scrollTop = el.scrollHeight;
          });
          await page.waitForTimeout(400);

          // Asserção geométrica via helper (ignora skeletons/placeholders)
          await expectLastRealElementAboveNav(
            page,
            NAV_HEIGHT,
            `${path} @ ${vp.name}`,
          );

          // Snapshot visual da faixa inferior — baseline por viewport
          const size = page.viewportSize();
          if (!size) return;
          await expect(page).toHaveScreenshot(`${name}-${vp.name}-bottom.png`, {
            clip: {
              x: 0,
              y: size.height - CLIP_HEIGHT,
              width: size.width,
              height: CLIP_HEIGHT,
            },
            maxDiffPixelRatio: 0.05,
            animations: 'disabled',
          });
        });
      }
    });
  }
});
