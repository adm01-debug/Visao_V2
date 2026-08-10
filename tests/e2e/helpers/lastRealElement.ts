/**
 * VISÃO - Helper E2E: identifica o "último elemento REAL" dentro de
 * `[data-app-scroll]`, ignorando placeholders, skeletons, spinners e
 * elementos invisíveis/zero-size que produziriam falsos positivos em
 * asserções de sobreposição com a BottomNavigation.
 *
 * Critérios para descartar um candidato:
 *   - getBoundingClientRect com width/height < MIN_SIZE_PX
 *   - visibility:hidden, display:none, opacity < 0.1
 *   - aria-hidden="true"
 *   - data-testid contendo "skeleton"|"placeholder"|"loading"|"spinner"
 *   - className contendo classes conhecidas de skeleton (shadcn/ui `.skeleton`,
 *     `animate-pulse` SEM conteúdo de texto, `sr-only`)
 *   - elementos puramente estruturais sem conteúdo visível (sem texto,
 *     sem imagem, sem background) — só descartados se também forem pequenos
 *
 * Retorna o ÚLTIMO candidato válido em ordem de DOM (post-order). Se não
 * houver candidato real, retorna `null` para que o teste possa diferenciar
 * "página vazia" de "página coberta".
 *
 * Uso:
 *   import { findLastRealElement, expectLastRealElementAboveNav } from './helpers/lastRealElement';
 *
 *   const last = await findLastRealElement(page);
 *   expect(last).not.toBeNull();
 *   await expectLastRealElementAboveNav(page, 60);
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface LastRealElementInfo {
  /** Tag em lowercase (ex.: 'div', 'button') */
  tag: string;
  /** Atributo class concatenado (truncado a 200 chars) */
  className: string;
  /** data-testid se presente */
  testId: string | null;
  /** Coordenadas do bounding rect */
  rect: { x: number; y: number; width: number; height: number; bottom: number; top: number };
  /** Texto inicial (até 80 chars) — útil para debug de falhas */
  textPreview: string;
  /** Total de elementos descartados durante o scan */
  rejected: number;
  /** Altura da viewport no momento da medição */
  viewportHeight: number;
}

/**
 * Executa a busca dentro do browser context. Toda a lógica de filtro vive
 * no `page.evaluate` para evitar round-trips DOM caros.
 */
export async function findLastRealElement(page: Page): Promise<LastRealElementInfo | null> {
  return page.evaluate(() => {
    const MIN_SIZE_PX = 8; // descarta hairlines, separadores invisíveis
    const MIN_OPACITY = 0.1;
    const SKELETON_TESTID = /(skeleton|placeholder|loading|spinner|shimmer)/i;
    // Regex de classes conhecidas de skeleton/loading (shadcn/ui + comuns)
    const SKELETON_CLASS = /\b(skeleton|sr-only|placeholder-shimmer|loading-pulse)\b/;

    const scroll = document.querySelector('[data-app-scroll]') as HTMLElement | null;
    if (!scroll) return null;

    const all = Array.from(scroll.querySelectorAll<HTMLElement>('*'));
    let rejected = 0;

    const isReal = (el: HTMLElement): boolean => {
      const rect = el.getBoundingClientRect();

      // 1. Tamanho mínimo
      if (rect.width < MIN_SIZE_PX || rect.height < MIN_SIZE_PX) return false;

      // 2. Visibilidade computada
      const cs = window.getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') return false;
      const opacity = parseFloat(cs.opacity || '1');
      if (opacity < MIN_OPACITY) return false;

      // 3. ARIA hidden (decorativo)
      if (el.getAttribute('aria-hidden') === 'true') return false;

      // 4. Testid de skeleton/loading
      const testId = el.getAttribute('data-testid');
      if (testId && SKELETON_TESTID.test(testId)) return false;

      // 5. Classes de skeleton conhecidas
      const cls = el.getAttribute('class') ?? '';
      if (SKELETON_CLASS.test(cls)) return false;

      // 6. animate-pulse SEM conteúdo de texto E sem filhos com texto reais
      //    (skeletons da shadcn usam `animate-pulse rounded-md bg-muted`)
      if (/\banimate-pulse\b/.test(cls)) {
        const hasText = (el.textContent ?? '').trim().length > 0;
        if (!hasText) return false;
      }

      // 7. Elemento fora da viewport scroll (acima da janela do scroll container)
      //    Ignora: queremos o último DENTRO do scroll, mesmo se virtualizado.
      //    Mas descarta elementos com bottom <= 0 (já saíram da tela).
      if (rect.bottom <= 0) return false;

      return true;
    };

    let last: HTMLElement | null = null;
    for (const el of all) {
      if (isReal(el)) last = el;
      else rejected++;
    }

    if (!last) return null;

    const rect = last.getBoundingClientRect();
    return {
      tag: last.tagName.toLowerCase(),
      className: (last.getAttribute('class') ?? '').slice(0, 200),
      testId: last.getAttribute('data-testid'),
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        top: rect.top,
      },
      textPreview: (last.textContent ?? '').trim().slice(0, 80),
      rejected,
      viewportHeight: window.innerHeight,
    };
  });
}

/**
 * Asserção de alto nível: o último elemento REAL deve ter `bottom` acima da
 * BottomNavigation. Falha com mensagem rica (incluindo tag/class/testid/preview)
 * para acelerar diagnóstico.
 */
export async function expectLastRealElementAboveNav(
  page: Page,
  navHeightPx = 60,
  routeLabel = page.url()
): Promise<LastRealElementInfo> {
  const info = await findLastRealElement(page);
  expect(
    info,
    `[lastRealElement] Nenhum elemento real encontrado em ${routeLabel} ` +
      `dentro de [data-app-scroll]. Página pode estar vazia ou só com skeletons.`
  ).not.toBeNull();

  const { rect, viewportHeight, tag, className, testId, textPreview, rejected } = info!;
  const limit = viewportHeight - navHeightPx + 1;

  expect(
    rect.bottom <= limit,
    `[lastRealElement] Último elemento real em ${routeLabel} sobrepõe BottomNav.\n` +
      `   bottom=${rect.bottom.toFixed(1)}  limite=${limit}  vh=${viewportHeight}  navH=${navHeightPx}\n` +
      `   tag=<${tag}>  testid=${testId ?? '—'}  rejeitados=${rejected}\n` +
      `   class="${className}"\n` +
      `   texto="${textPreview}"`
  ).toBe(true);

  return info!;
}
