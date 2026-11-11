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
import { existsSync } from 'node:fs';
import { test, expect, devices } from '@playwright/test';
import { detectBottomNavOverlap, formatOverlapMessage } from './helpers/detectOverlap';
import {
  collectCoverageData,
  writeVisualFailureReport,
  REPORT_ROUTES,
} from './helpers/visualFailureReport';
import { snapshotName } from './helpers/snapshotName';

const ROUTES = [
  { path: '/', name: 'root' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/cameras', name: 'cameras' },
  { path: '/alerts', name: 'alerts' },
  { path: '/alerts-timeline', name: 'alerts-timeline' },
  { path: '/evaluation', name: 'evaluation' },
  { path: '/zones', name: 'zones' },
  { path: '/recordings', name: 'recordings' },
  { path: '/analytics', name: 'analytics' },
  { path: '/settings', name: 'settings' },
  { path: '/users', name: 'users' },
  { path: '/face-recognition', name: 'face-recognition' },
  { path: '/license-plate', name: 'license-plate' },
  { path: '/productivity', name: 'productivity' },
  { path: '/heatmap', name: 'heatmap' },
  // `/automation` não existe em src/App.tsx (caía no NotFound); a rota é /automation-rules.
  { path: '/automation-rules', name: 'automation-rules' },
  { path: '/security', name: 'security' },
  { path: '/behavior-detection', name: 'behavior-detection' },
];

const BOTTOM_STRIP_HEIGHT = 200;

// devices['iPhone 12'] traz defaultBrowserType: 'webkit', o que faria o projeto
// `chromium` abrir o WebKit (não instalado no CI). A intenção destas specs é
// viewport/UA/touch de iPhone — emulados no navegador do projeto.
const { defaultBrowserType: _dbt, ...iPhone12 } = devices['iPhone 12'];
test.use(iPhone12);

test.describe('Mobile Nav Visual Regression', () => {
  for (const { path, name } of ROUTES) {
    test(`${name}: snapshot mobile + sem overlap da BottomNav`, async ({ page }, testInfo) => {
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

      // Camada 1b: visibilidade do último elemento via getBoundingClientRect
      // + verificação de que a BottomNav não cobre área interativa/clicável.
      const lastElementCheck = await page.evaluate(() => {
        const scroll = document.querySelector('[data-app-scroll]') as HTMLElement | null;
        const nav = document.querySelector(
          '[data-testid="bottom-navigation"], nav.fixed.bottom-0'
        ) as HTMLElement | null;
        if (!scroll) return { ok: false, reason: 'no-scroll-container' };

        const vh = window.innerHeight;
        const navTop = nav ? nav.getBoundingClientRect().top : vh;

        // Último elemento (qualquer com tamanho > 0) dentro do scroll
        const allEls = Array.from(scroll.querySelectorAll<HTMLElement>('*')).filter((el) => {
          const r = el.getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          return (
            r.width > 0 &&
            r.height > 0 &&
            cs.visibility !== 'hidden' &&
            cs.display !== 'none' &&
            parseFloat(cs.opacity || '1') >= 0.1
          );
        });
        const last = allEls.reduce<HTMLElement | null>((acc, el) => {
          if (!acc) return el;
          return el.getBoundingClientRect().bottom > acc.getBoundingClientRect().bottom ? el : acc;
        }, null);

        if (!last) return { ok: false, reason: 'no-last-element' };
        const lastRect = last.getBoundingClientRect();
        const lastVisible =
          lastRect.width > 0 && lastRect.height > 0 && lastRect.bottom > 0 && lastRect.top < vh;

        // Elementos clicáveis/interativos visíveis no viewport
        const interactiveSel =
          'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
        const interactives = Array.from(
          scroll.querySelectorAll<HTMLElement>(interactiveSel)
        ).filter((el) => {
          const r = el.getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          return (
            r.width > 0 &&
            r.height > 0 &&
            r.top < vh &&
            r.bottom > 0 &&
            cs.visibility !== 'hidden' &&
            cs.display !== 'none' &&
            parseFloat(cs.opacity || '1') >= 0.1
          );
        });

        const TOLERANCE = 4;
        const covered = interactives
          .map((el) => {
            const r = el.getBoundingClientRect();
            const overlapPx = r.bottom - navTop;
            return {
              overlapPx,
              top: r.top,
              bottom: r.bottom,
              tag: el.tagName.toLowerCase(),
              text: (el.textContent ?? '').trim().slice(0, 60),
            };
          })
          .filter((c) => c.overlapPx > TOLERANCE && c.top < navTop);

        return {
          ok: true,
          lastVisible,
          lastRect: {
            top: lastRect.top,
            bottom: lastRect.bottom,
            width: lastRect.width,
            height: lastRect.height,
          },
          viewportHeight: vh,
          navTop,
          interactivesScanned: interactives.length,
          coveredCount: covered.length,
          coveredSample: covered.slice(0, 5),
        };
      });

      expect(
        lastElementCheck.ok,
        `[${path}] última verificação falhou: ${('reason' in lastElementCheck && lastElementCheck.reason) || 'desconhecido'}`
      ).toBe(true);

      if (lastElementCheck.ok) {
        expect(
          lastElementCheck.lastVisible,
          `[${path}] último elemento não está visível (rect=${JSON.stringify(lastElementCheck.lastRect)}, vh=${lastElementCheck.viewportHeight})`
        ).toBe(true);

        expect(
          lastElementCheck.coveredCount,
          `[${path}] BottomNav cobre ${lastElementCheck.coveredCount} elemento(s) interativo(s) ` +
            `(navTop=${lastElementCheck.navTop}, vh=${lastElementCheck.viewportHeight}, ` +
            `scanned=${lastElementCheck.interactivesScanned}). Amostra: ` +
            JSON.stringify(lastElementCheck.coveredSample)
        ).toBe(0);
      }

      // Snapshots — naming padronizado via helper:
      //   __screenshots__/<spec>/<project>/<route>/<variant>.png
      const snapshotsAttempted: string[] = [];
      const fullPageName = snapshotName({ route: name, variant: 'fullpage' });
      const bottomStripName = snapshotName({ route: name, variant: 'bottom-strip' });
      const vp = page.viewportSize();

      const runSnapshots = async () => {
        snapshotsAttempted.push(fullPageName);
        await expect(page).toHaveScreenshot(fullPageName, {
          fullPage: true,
          maxDiffPixelRatio: 0.02,
          threshold: 0.2,
          animations: 'disabled',
          mask: [page.locator('[data-dynamic]')],
        });

        if (!vp) return;
        snapshotsAttempted.push(bottomStripName);
        await expect(page).toHaveScreenshot(bottomStripName, {
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
      };

      // Sem baseline commitada, toHaveScreenshot só grava o "actual" e falha —
      // não há o que comparar. No CI (que nunca grava baseline) a comparação de
      // pixels é pulada com anotação explícita; as asserções programáticas de
      // overlap acima continuam valendo. Gerar baselines: npm run
      // test:mobile-nav-visual:update (ver docs/MOBILE_NAV_VISUAL_TESTING.md).
      const missingBaselines = [fullPageName, bottomStripName].filter(
        (n) => !existsSync(testInfo.snapshotPath(n, { kind: 'screenshot' }))
      );
      if (process.env.CI && missingBaselines.length > 0) {
        testInfo.annotations.push({
          type: 'baseline-ausente',
          description: `Comparação visual não executada: sem baseline para ${missingBaselines.join(', ')} no projeto ${testInfo.project.name}.`,
        });
        return;
      }

      try {
        await runSnapshots();
      } catch (err) {
        if (REPORT_ROUTES.has(name)) {
          const coverage = await collectCoverageData(page).catch(() => null);
          if (coverage) {
            await writeVisualFailureReport(
              testInfo,
              {
                routeName: name,
                routePath: path,
                url: page.url(),
                viewport: coverage.viewport,
                navTop: coverage.navTop,
                covered: coverage.covered,
                scannedCount: coverage.scannedCount,
                errorMessage: err instanceof Error ? err.message : String(err),
              },
              snapshotsAttempted
            ).catch(() => undefined);
          }
        }
        throw err;
      }
    });
  }
});
