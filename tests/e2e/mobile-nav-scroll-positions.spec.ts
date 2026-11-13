/**
 * VISÃO E2E — Mobile Nav overlap em múltiplas posições de scroll.
 *
 * Diferencial: enquanto `mobile-nav-overlap`, `mobile-nav-content-overlap` e
 * `mobile-nav-measured-overlap` validam apenas o estado final do scroll
 * (`scrollTop = scrollHeight`), este spec varre TRÊS posições — topo (0%),
 * meio (50%) e fim (100%) — para capturar elementos `position: sticky/fixed/
 * absolute`, FABs, banners flutuantes e modais inline que cobrem conteúdo
 * apenas em scroll parcial e desaparecem da viewport no fim.
 *
 * Algoritmo por (rota × posição):
 *   1. gotoAuthenticated + estabiliza render
 *   2. Mede scrollHeight real do `[data-app-scroll]` (fallback `window`)
 *   3. Posiciona scroll no offset alvo
 *   4. Aguarda 350ms para virtual lists / animações
 *   5. Mede altura dinâmica da BottomNav (helper compartilhado)
 *   6. Coleta elementos visíveis (interativos + texto significativo)
 *   7. Falha listando os 5 piores overlaps com tolerância de 4px
 */
import { test, expect } from './helpers/testFixtures';
import { gotoAuthenticated } from './helpers/authSession';
import { measureBottomNav } from './helpers/measureBottomNav';

const ROUTES = [
  '/dashboard',
  '/cameras',
  '/alerts',
  '/alerts-timeline',
  '/heatmap',
  '/analytics',
  '/recordings',
  '/people',
] as const;

type ScrollPosition = 'top' | 'middle' | 'bottom';
const POSITIONS: readonly ScrollPosition[] = ['top', 'middle', 'bottom'] as const;
const OVERLAP_TOLERANCE_PX = 4;

interface OverlapItem {
  tag: string;
  text: string;
  selector: string;
  bottom: number;
  overlap: number;
}

interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
}

test.describe('mobile-nav-scroll-positions — overlap em topo/meio/fim', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of ROUTES) {
    for (const pos of POSITIONS) {
      test(`${route} @ scroll=${pos} — sem overlap com BottomNav`, async ({ page }) => {
        const ok = await gotoAuthenticated(page, route, { waitUntil: 'domcontentloaded' });
        if (!ok) return;

        // Estabilização inicial (render + lazy chunks).
        await page.waitForTimeout(300);

        // Posiciona o scroll no offset alvo e captura métricas.
        const metrics = await page.evaluate((position: ScrollPosition): ScrollMetrics => {
          const container = document.querySelector<HTMLElement>('[data-app-scroll]');
          const vh = window.innerHeight;

          if (container) {
            const sh = container.scrollHeight;
            const maxTop = Math.max(0, sh - vh);
            const target =
              position === 'top' ? 0 : position === 'middle' ? Math.floor(maxTop / 2) : maxTop;
            container.scrollTo({ top: target, behavior: 'instant' as ScrollBehavior });
            return { scrollTop: container.scrollTop, scrollHeight: sh, viewportHeight: vh };
          }

          const sh = document.documentElement.scrollHeight;
          const maxTop = Math.max(0, sh - vh);
          const target =
            position === 'top' ? 0 : position === 'middle' ? Math.floor(maxTop / 2) : maxTop;
          window.scrollTo({ top: target, behavior: 'instant' as ScrollBehavior });
          return { scrollTop: window.scrollY, scrollHeight: sh, viewportHeight: vh };
        }, pos);

        // Aguarda virtual lists/lazy renders/animações.
        await page.waitForTimeout(350);

        const nav = await measureBottomNav(page);
        expect(
          nav.found,
          `[mobile-nav-scroll-positions] BottomNav não encontrada em "${route}" @ ${pos}.`
        ).toBe(true);

        const overlaps = await page.evaluate(
          ({ navTop, tol }: { navTop: number; tol: number }): OverlapItem[] => {
            const vh = window.innerHeight;
            const selector =
              'button, a, input, textarea, select, [role="button"], h1, h2, h3, p, li, td, [role="link"]';
            const els = Array.from(document.querySelectorAll<HTMLElement>(selector));

            // Computa um seletor curto para diagnóstico.
            const describe = (el: HTMLElement): string => {
              const tag = el.tagName.toLowerCase();
              const id = el.id ? `#${el.id}` : '';
              const cls =
                el.classList.length > 0 ? `.${Array.from(el.classList).slice(0, 2).join('.')}` : '';
              const testid = el.getAttribute('data-testid');
              return testid ? `${tag}[data-testid="${testid}"]` : `${tag}${id}${cls}`;
            };

            const inNav = (el: HTMLElement): boolean =>
              !!el.closest(
                '[data-testid="bottom-navigation"], [data-bottom-nav], nav.fixed.bottom-0'
              );

            const items: OverlapItem[] = [];
            for (const el of els) {
              if (inNav(el)) continue;
              const r = el.getBoundingClientRect();
              if (r.width <= 4 || r.height <= 4) continue;
              // Apenas elementos visíveis na viewport atual.
              if (r.bottom <= 0 || r.top >= vh) continue;
              const cs = window.getComputedStyle(el);
              if (
                cs.visibility === 'hidden' ||
                cs.display === 'none' ||
                parseFloat(cs.opacity || '1') < 0.1
              )
                continue;
              const overlap = r.bottom - navTop;
              if (overlap > tol) {
                const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
                items.push({
                  tag: el.tagName.toLowerCase(),
                  text,
                  selector: describe(el),
                  bottom: Math.round(r.bottom * 10) / 10,
                  overlap: Math.round(overlap * 10) / 10,
                });
              }
            }
            // Ordena pelos piores overlaps primeiro.
            items.sort((a, b) => b.overlap - a.overlap);
            return items.slice(0, 5);
          },
          { navTop: nav.topPx, tol: OVERLAP_TOLERANCE_PX }
        );

        if (overlaps.length > 0) {
          const lines = overlaps
            .map(
              (o, i) =>
                `  ${i + 1}. <${o.tag}> "${o.text}" → ${o.selector} ` +
                `(bottom=${o.bottom}, overlap=${o.overlap}px)`
            )
            .join('\n');
          throw new Error(
            `[mobile-nav-scroll-positions] ${route} @ ${pos} ` +
              `(scrollTop=${metrics.scrollTop}/${metrics.scrollHeight}, vh=${metrics.viewportHeight})\n` +
              `  navTop=${nav.topPx.toFixed(1)}, navHeight=${nav.heightPx.toFixed(1)}, ` +
              `overlaps=${overlaps.length}\n${lines}`
          );
        }
      });
    }
  }
});
