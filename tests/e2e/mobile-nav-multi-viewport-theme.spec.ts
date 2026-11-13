/**
 * VISÃO E2E — Multi-viewport × multi-theme visual snapshots.
 *
 * Captura snapshots da BottomNavigation + faixa inferior em três viewports
 * (mobile-small, mobile-large, tablet-portrait) cruzados com os dois temas
 * suportados (`light`, `dark`) para detectar regressões visuais que afetem
 * o layout — sombras invertidas, contraste de borda perdido, ícones que
 * somem em fundo claro, badges que mudam tamanho com tipografia diferente,
 * etc.
 *
 * Diferencial vs `mobile-nav-visual.spec.ts`:
 *   - Aquele cobre 18 rotas em 1 viewport × 1 tema (dark default).
 *   - Este cobre 4 rotas críticas em 3 viewports × 2 temas = 24 baselines.
 *   - Foco: detectar diferenças visuais entre temas que possam empurrar
 *     conteúdo para baixo da nav (ex.: bordas de 1px só no light theme,
 *     altura de header diferente, badges com font-weight maior).
 *
 * O tema é persistido em `localStorage` antes do `goto` (chave `visao-theme`,
 * formato `{ mode, variant }`) para garantir SSR-like inicialização sem
 * flicker de tema padrão.
 *
 * Naming via `snapshotName`:
 *   __screenshots__/<spec>/mobile-safari/<route>/<variant>@<viewport-theme>.png
 *
 * Atualização: `playwright test mobile-nav-multi-viewport-theme --update-snapshots`
 */
import { existsSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { snapshotName } from './helpers/snapshotName';

const ROUTES = [
  { path: '/', name: 'root' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/heatmap', name: 'heatmap' },
  { path: '/analytics', name: 'analytics' },
] as const;

const VIEWPORTS = [
  { name: 'mobile-small', width: 360, height: 640 },
  { name: 'mobile-large', width: 414, height: 896 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
] as const;

const THEMES = ['light', 'dark'] as const;

const BOTTOM_STRIP_HEIGHT = 200;
const THEME_STORAGE_KEY = 'visao-theme';

test.describe('mobile-nav multi-viewport × multi-theme — visual snapshots', () => {
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test.describe(`viewport=${vp.name} theme=${theme}`, () => {
        test.use({ viewport: { width: vp.width, height: vp.height } });

        for (const { path, name } of ROUTES) {
          test(`${name} @ ${vp.name} ${theme}`, async ({ page }, testInfo) => {
            test.setTimeout(30_000);

            // Persiste tema ANTES do primeiro paint para evitar flash do default.
            // `addInitScript` roda em todo new document — sobrevive a navigations.
            await page.addInitScript(
              ({ key, mode }) => {
                try {
                  localStorage.setItem(key, JSON.stringify({ mode, variant: 'default' }));
                  // Pre-aplica classe no <html> para SSR-like consistência.
                  const root = document.documentElement;
                  root.classList.remove('light', 'dark');
                  root.classList.add(mode);
                } catch {
                  /* storage indisponível em about:blank — ignora */
                }
              },
              { key: THEME_STORAGE_KEY, mode: theme }
            );

            await page.goto(path, { waitUntil: 'networkidle' }).catch(() => {});

            if (/\/(auth|login)(\?|$|\/)/.test(page.url())) {
              test.skip(true, `Rota ${path} requer autenticação — coberta por outras camadas.`);
              return;
            }

            // Confirma que o tema foi aplicado de fato (defesa contra race do Provider).
            await page
              .waitForFunction((mode) => document.documentElement.classList.contains(mode), theme, {
                timeout: 5_000,
              })
              .catch(() => {});

            await page.waitForSelector('[data-app-scroll]', { timeout: 10_000 }).catch(() => {});
            await page.waitForLoadState('networkidle').catch(() => {});

            // Aguarda skeletons sumirem
            await page
              .waitForFunction(
                () => document.querySelectorAll('[data-skeleton], .animate-pulse').length === 0,
                undefined,
                { timeout: 5_000 }
              )
              .catch(() => {});

            // Scroll até o fim para validar último elemento + nav simultaneamente.
            await page.evaluate(() => {
              const el = document.querySelector('[data-app-scroll]') as HTMLElement | null;
              if (el) el.scrollTop = el.scrollHeight;
            });
            await page.waitForTimeout(400);

            // Snapshots padronizados — naming inclui viewport+theme via sufixo.
            const variantSuffix = `${vp.name}-${theme}`;
            const fullPageName = snapshotName({
              route: name,
              variant: 'fullpage',
              viewport: variantSuffix,
            });
            const stripName = snapshotName({
              route: name,
              variant: 'bottom-strip',
              viewport: variantSuffix,
            });

            // Sem baseline commitada, toHaveScreenshot so grava o "actual" e falha
            // no CI (que nunca grava baseline). Pula com anotacao explicita.
            const missingBaselines = [fullPageName, stripName].filter(
              (n) => !existsSync(testInfo.snapshotPath(n, { kind: 'screenshot' }))
            );
            if (process.env.CI && missingBaselines.length > 0) {
              testInfo.annotations.push({
                type: 'baseline-ausente',
                description: `Comparação visual não executada: sem baseline para ${missingBaselines.join(', ')} no projeto ${testInfo.project.name}.`,
              });
              return;
            }

            await expect(page).toHaveScreenshot(fullPageName, {
              fullPage: true,
              maxDiffPixelRatio: 0.02,
              threshold: 0.2,
              animations: 'disabled',
              mask: [page.locator('[data-dynamic]')],
            });

            await expect(page).toHaveScreenshot(stripName, {
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
    }
  }
});
