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
import { EFFECTIVE_RECT_SRC } from './visibleClip';

export interface LastRealElementInfo {
  /** Tag em lowercase (ex.: 'div', 'button') */
  tag: string;
  /** Atributo class concatenado (truncado a 200 chars) */
  className: string;
  /** data-testid se presente */
  testId: string | null;
  /** Coordenadas do bounding rect */
  rect: { x: number; y: number; width: number; height: number; bottom: number; top: number };
  /** `bottom` apos clipping de ancestrais — e o que o usuario enxerga */
  effectiveBottom: number;
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
  return page.evaluate((clipSrc) => {
    // Função pura reconstruída no browser (closures não cruzam Node→browser).
    const effectiveRect = new Function('return ' + clipSrc.trim())() as (
      el: Element,
      viewportHeight: number
    ) => { top: number; bottom: number; height: number; width: number; visible: boolean };
    const MIN_SIZE_PX = 8; // descarta hairlines, separadores invisíveis
    const MIN_OPACITY = 0.1;
    const SKELETON_TESTID = /(skeleton|placeholder|loading|spinner|shimmer)/i;
    // Regex de classes conhecidas de skeleton/loading (shadcn/ui + comuns)
    const SKELETON_CLASS = /\b(skeleton|sr-only|placeholder-shimmer|loading-pulse)\b/;
    // Formas SVG sao desenho, nao conteudo: um <path> de grade de grafico
    // atravessa a viewport inteira e seria eleito "ultimo elemento real" no
    // lugar do card que o contem.
    const SVG_SHAPE = /^(path|circle|rect|line|polyline|polygon|ellipse|g|defs|use|svg)$/;

    const scroll = document.querySelector('[data-app-scroll]') as HTMLElement | null;
    if (!scroll) return null;

    // Rola ao fim AQUI, no mesmo frame da medicao. Fazer o scroll em um
    // `page.evaluate` separado deixa uma janela em que o mobileNavGuard /
    // scroll-restoration reverte a posicao e a medicao enxerga o topo.
    scroll.scrollTop = scroll.scrollHeight;
    window.scrollTo(0, document.body.scrollHeight);

    const all = Array.from(scroll.querySelectorAll<HTMLElement>('*'));
    let rejected = 0;

    const isReal = (el: HTMLElement): boolean => {
      // 0. Formas vetoriais (icone/grade de grafico) nao sao conteudo de pagina
      if (SVG_SHAPE.test(el.tagName.toLowerCase())) return false;

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

      // 7. Descarta o que está fora da viewport vertical.
      if (rect.bottom <= 0) return false;

      // 8. Wrapper estrutural sem texto proprio nao e conteudo: containers
      //    full-bleed carregam todo o dashboard num <div> de classe vazia e
      //    eram eleitos "ultimo elemento real" no lugar dos filhos reais.
      if (!(el.textContent ?? '').trim()) return false;

      // 8. Descarta conteúdo recortado pelos ancestrais (`overflow:hidden|auto`).
      //    `rect.bottom` bruto ignora o clipping: itens de um card com lista
      //    interna reportam coordenadas fora da caixa visível e eram eleitos
      //    "último elemento real" mesmo sem o usuário conseguir vê-los.
      if (!effectiveRect(el, window.innerHeight).visible) return false;

      return true;
    };

    let last: HTMLElement | null = null;
    for (const el of all) {
      if (isReal(el)) last = el;
      else rejected++;
    }

    if (!last) return null;

    const rect = last.getBoundingClientRect();
    const eff = effectiveRect(last, window.innerHeight);
    return {
      tag: last.tagName.toLowerCase(),
      effectiveBottom: eff.bottom,
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
  }, EFFECTIVE_RECT_SRC);
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

  const { viewportHeight, tag, className, testId, textPreview, rejected } = info!;
  const limit = viewportHeight - navHeightPx + 1;
  // `rect.bottom` e bruto; `effectiveBottom` aplica o clipping dos ancestrais.
  const measured = info!.effectiveBottom;

  expect(
    measured <= limit,
    `[lastRealElement] Último elemento real em ${routeLabel} sobrepõe BottomNav.\n` +
      `   bottom=${measured.toFixed(1)}  limite=${limit}  vh=${viewportHeight}  navH=${navHeightPx}\n` +
      `   tag=<${tag}>  testid=${testId ?? '—'}  rejeitados=${rejected}\n` +
      `   class="${className}"\n` +
      `   texto="${textPreview}"`
  ).toBe(true);

  return info!;
}
