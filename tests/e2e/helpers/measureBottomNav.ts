/**
 * VISÃO - Helper E2E: medição dinâmica da BottomNavigation.
 *
 * Em vez de assumir uma altura fixa (h-16=64px) ou valor mágico de padding,
 * este helper deriva a altura REAL da `BottomNavigation` a partir do layout
 * em runtime via `getBoundingClientRect()`. Isso protege a suíte contra:
 *
 *   - Mudanças de altura (ex.: badges, segunda linha, safe-area-inset).
 *   - Diferenças entre devices (notch iOS vs Android).
 *   - Refatorações que alterem `h-16` sem atualizar constantes nos testes.
 *
 * A medição inclui automaticamente padding/border próprios da nav e o
 * `safe-area-inset-bottom` do iOS, pois `getBoundingClientRect` reflete o
 * box renderizado de fato.
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface BottomNavMeasurement {
  /** Encontrou a BottomNav (visível e ancorada no rodapé). */
  found: boolean;
  /** Altura real do elemento em px (rect.height). */
  heightPx: number;
  /** Topo do elemento (rect.top) — limite superior que conteúdo não deve cruzar. */
  topPx: number;
  /** Bottom do elemento (rect.bottom) — deve coincidir com viewport.height ± 1. */
  bottomPx: number;
  /** Altura do viewport no momento da medição. */
  viewportHeight: number;
  /** Seletor que casou (para diagnóstico). */
  matchedSelector: string | null;
}

const NAV_SELECTORS = [
  '[data-testid="bottom-navigation"]',
  '[data-bottom-nav]',
  'nav.fixed.bottom-0',
];

/**
 * Mede a BottomNav. Lança se não encontrar (use `findBottomNav` para
 * variante que retorna `found: false` sem lançar).
 */
export async function measureBottomNav(page: Page): Promise<BottomNavMeasurement> {
  const result = await page.evaluate((selectors) => {
    const vh = window.innerHeight;
    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) continue;
      const cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      // Deve estar ancorada no rodapé (tolera 2px de subpixel)
      if (Math.abs(r.bottom - vh) > 2) continue;
      return {
        found: true,
        heightPx: r.height,
        topPx: r.top,
        bottomPx: r.bottom,
        viewportHeight: vh,
        matchedSelector: sel,
      };
    }
    return {
      found: false,
      heightPx: 0,
      topPx: vh,
      bottomPx: vh,
      viewportHeight: vh,
      matchedSelector: null,
    };
  }, NAV_SELECTORS);
  return result;
}

/**
 * Asserção de alto nível: valida que o último elemento real do conteúdo
 * (`[data-app-scroll]`) tem `bottom` acima da BottomNav medida dinamicamente,
 * com tolerância opcional para arredondamento de subpixel.
 *
 * Uso típico em testes mobile:
 *   await page.goto('/dashboard');
 *   await page.waitForLoadState('networkidle');
 *   await assertNoOverlapWithMeasuredNav(page);
 */
export async function assertNoOverlapWithMeasuredNav(
  page: Page,
  opts: { tolerancePx?: number; routeLabel?: string } = {},
): Promise<{ navHeight: number; lastBottom: number }> {
  const tolerance = opts.tolerancePx ?? 4;
  const route = opts.routeLabel ?? page.url();

  const nav = await measureBottomNav(page);
  expect(
    nav.found,
    `[measureBottomNav] BottomNavigation não encontrada em "${route}". ` +
      `Esperado um elemento com seletor: ${NAV_SELECTORS.join(', ')}, ` +
      `visível e com bottom ≈ ${nav.viewportHeight}px.`,
  ).toBe(true);

  // Sanidade: altura razoável (entre 32 e 160 px). Captura regressões absurdas
  // sem fixar valor exato.
  expect(
    nav.heightPx >= 32 && nav.heightPx <= 160,
    `[measureBottomNav] Altura suspeita: ${nav.heightPx.toFixed(1)}px ` +
      `(esperado 32–160). Verifique tokens da BottomNav.`,
  ).toBe(true);

  const overlap = await page.evaluate(
    ({ navTop, tol }) => {
      const scroll = document.querySelector('[data-app-scroll]') as HTMLElement | null;
      if (!scroll) return { mainBottom: 0, hasContent: false };

      const candidates = Array.from(
        scroll.querySelectorAll<HTMLElement>(
          'button, a, input, textarea, select, [role="button"], h1, h2, h3, p, li, td',
        ),
      ).filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          r.bottom > 0 &&
          cs.visibility !== 'hidden' &&
          cs.display !== 'none' &&
          parseFloat(cs.opacity || '1') >= 0.1
        );
      });
      const last = candidates.reduce<HTMLElement | null>((acc, el) => {
        if (!acc) return el;
        return el.getBoundingClientRect().bottom > acc.getBoundingClientRect().bottom ? el : acc;
      }, null);
      const mainBottom = last ? last.getBoundingClientRect().bottom : 0;
      const _ = tol; // referenciado para simetria; cálculo ocorre fora
      void _;
      return { mainBottom, hasContent: !!last };
    },
    { navTop: nav.topPx, tol: tolerance },
  );

  if (!overlap.hasContent) {
    return { navHeight: nav.heightPx, lastBottom: 0 };
  }

  const overlapPx = overlap.mainBottom - nav.topPx;
  expect(
    overlapPx <= tolerance,
    `[measureBottomNav] Overlap em "${route}": ${overlapPx.toFixed(1)}px ` +
      `(último conteúdo bottom=${overlap.mainBottom.toFixed(1)}, ` +
      `nav top=${nav.topPx.toFixed(1)}, nav height=${nav.heightPx.toFixed(1)}, ` +
      `viewport=${nav.viewportHeight}, tolerância=${tolerance}px). ` +
      `Verifique se mb-mobile-nav está aplicado no MainLayout.`,
  ).toBe(true);

  return { navHeight: nav.heightPx, lastBottom: overlap.mainBottom };
}
