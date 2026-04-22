/**
 * VISÃO - Helper compartilhado para detectar sobreposição da BottomNavigation
 * com o último elemento interativo visível dentro do conteúdo principal.
 *
 * Usado por specs Playwright como assertion programática complementar ao
 * snapshot visual. Tolera 4px de margem para evitar falsos positivos por
 * arredondamento de subpixel.
 */
import type { Page } from '@playwright/test';

export interface OverlapResult {
  overlap: number;
  mainBottom: number;
  navTop: number;
  viewportHeight: number;
  hasNav: boolean;
  hasContent: boolean;
}

const TOLERANCE_PX = 4;

/**
 * Mede a sobreposição vertical entre BottomNavigation e o último elemento
 * visível dentro de [data-app-scroll]. Retorna 0 quando não há overlap real.
 */
export async function detectBottomNavOverlap(page: Page): Promise<OverlapResult> {
  return await page.evaluate((tolerance) => {
    const nav = document.querySelector(
      '[data-testid="bottom-navigation"], nav.fixed.bottom-0'
    ) as HTMLElement | null;

    const scroll = document.querySelector('[data-app-scroll]') as HTMLElement | null;

    const vh = window.innerHeight;

    if (!nav) {
      return {
        overlap: 0,
        mainBottom: 0,
        navTop: vh,
        viewportHeight: vh,
        hasNav: false,
        hasContent: !!scroll,
      };
    }

    const navRect = nav.getBoundingClientRect();
    const navTop = navRect.top;

    if (!scroll) {
      return {
        overlap: 0,
        mainBottom: 0,
        navTop,
        viewportHeight: vh,
        hasNav: true,
        hasContent: false,
      };
    }

    // Coleta candidatos visíveis dentro do scroll container
    const interactiveSelectors = 'button, a, input, textarea, select, [role="button"]';
    const candidates = Array.from(
      scroll.querySelectorAll<HTMLElement>(interactiveSelectors)
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh;
    });

    // Pega o de maior `bottom` (mais próximo da nav)
    const last = candidates.reduce<HTMLElement | null>((acc, el) => {
      if (!acc) return el;
      return el.getBoundingClientRect().bottom > acc.getBoundingClientRect().bottom ? el : acc;
    }, null);

    if (!last) {
      return {
        overlap: 0,
        mainBottom: 0,
        navTop,
        viewportHeight: vh,
        hasNav: true,
        hasContent: true,
      };
    }

    const mainBottom = last.getBoundingClientRect().bottom;
    const rawOverlap = mainBottom - navTop;
    const overlap = rawOverlap > tolerance ? rawOverlap : 0;

    return {
      overlap,
      mainBottom,
      navTop,
      viewportHeight: vh,
      hasNav: true,
      hasContent: true,
    };
  }, TOLERANCE_PX);
}

/**
 * Formata mensagem de diagnóstico amigável para asserções que falham.
 */
export function formatOverlapMessage(route: string, result: OverlapResult): string {
  return (
    `Overlap detectado em "${route}": ${result.overlap.toFixed(1)}px ` +
    `(último conteúdo bottom=${result.mainBottom.toFixed(1)}px, ` +
    `nav top=${result.navTop.toFixed(1)}px, viewport=${result.viewportHeight}px). ` +
    `Verifique se mb-mobile-nav está aplicado no MainLayout.`
  );
}
