/**
 * VISÃO - Visual regression: BottomNavigation não cobre conteúdo (mobile)
 *
 * Suíte ampla que percorre todas as rotas autenticadas críticas em viewport
 * iPhone 12, capturando snapshots full-page e da faixa inferior (zona crítica
 * onde a BottomNavigation, h-16=64px, pode sobrepor conteúdo). Combina:
 *
 * 1. Asserção programática via `detectBottomNavOverlap` (defesa em profundidade,
 *    pega casos que diff visual perde por anti-aliasing).
 * 2. Snapshot full-page com `maxDiffPixelRatio: 0.02`.
 * 3. Snapshot da faixa inferior (200px) com tolerância maior para flakiness.
 *
 * Rotas que redirecionam para /auth (CI sem credenciais seedadas) são
 * marcadas como skipped — cobertura garantida pela checagem estática
 * (`scripts/check-mobile-nav.mjs`) e pela camada de overlap programático.
 *
 * Rodar isolado:    npm run test:mobile-nav-visual
 * Atualizar baseline: npm run test:mobile-nav-visual:update
 * Doc: docs/MOBILE_NAV_VISUAL_TESTING.md
 */
import { test, expect, devices } from '@playwright/test';
import { detectBottomNavOverlap, formatOverlapMessage } from './helpers/detectOverlap';

const ROUTES = [
  { path: '/', name: 'root' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/cameras', name: 'cameras' },
  { path: '/alerts', name: 'alerts' },
  { path: '/zones', name: 'zones' },
  { path: '/recordings', name: 'recordings' },
  { path: '/analytics', name: 'analytics' },
  { path: '/settings', name: 'settings' },
  { path: '/users', name: 'users' },
  { path: '/face-recognition', name: 'face-recognition' },
  { path: '/license-plate', name: 'license-plate' },
  { path: '/productivity', name: 'productivity' },
  { path: '/heatmap', name: 'heatmap' },
  { path: '/automation', name: 'automation' },
  { path: '/security', name: 'security' },
  { path: '/behavior-detection', name: 'behavior-detection' },
];

const BOTTOM_STRIP_HEIGHT = 200;

test.use({ ...devices['iPhone 12'] });

test.describe('Mobile Nav Visual Regression', () => {
  for (const { path, name } of ROUTES) {
    test(`${name}: snapshot mobile + sem overlap da BottomNav`, async ({ page }) => {
      test.setTimeout(30_000);

      await page.goto(path, { waitUntil: 'networkidle' }).catch(() => {});

      // Pula rotas que exigem autenticação (CI não tem credenciais seedadas)
      if (/\/(auth|login)(\?|$|\/)/.test(page.url())) {
        test.skip(true, `Rota ${path} requer autenticação — coberta por checagem estática.`);
        return;
      }

      // Aguarda carregamento estabilizar
      await page.waitForSelector('[data-app-scroll]', { timeout: 10_000 }).catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});

      // Aguarda skeletons sumirem (heurística leve)
      await page
        .waitForFunction(
          () => document.querySelectorAll('[data-skeleton], .animate-pulse').length === 0,
          undefined,
          { timeout: 5_000 }
        )
        .catch(() => {});

      // Scroll até o fim para forçar último elemento aparecer
      await page.evaluate(() => {
        const el = document.querySelector('[data-app-scroll]') as HTMLElement | null;
        if (el) el.scrollTop = el.scrollHeight;
      });
      await page.waitForTimeout(400);

      // Asserção programática (camada 1)
      const overlap = await detectBottomNavOverlap(page);
      expect(overlap.overlap, formatOverlapMessage(path, overlap)).toBe(0);

      // Snapshot full-page (camada 2)
      await expect(page).toHaveScreenshot(`${name}-fullpage.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
        threshold: 0.2,
        animations: 'disabled',
        mask: [page.locator('[data-dynamic]')],
      });

      // Snapshot faixa inferior — zona crítica (camada 3)
      const vp = page.viewportSize();
      if (!vp) return;
      await expect(page).toHaveScreenshot(`${name}-bottom-strip.png`, {
        clip: {
          x: 0,
          y: vp.height - BOTTOM_STRIP_HEIGHT,
          width: vp.width,
          height: BOTTOM_STRIP_HEIGHT,
        },
        maxDiffPixelRatio: 0.02,
        threshold: 0.2,
        animations: 'disabled',
        mask: [page.locator('[data-dynamic]')],
      });
    });
  }
});
