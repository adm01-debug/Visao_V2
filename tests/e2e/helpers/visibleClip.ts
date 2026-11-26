/**
 * VISÃO E2E — visibilidade efetiva de um elemento após clipping de ancestrais.
 *
 * `getBoundingClientRect()` ignora `overflow: hidden|auto|scroll` dos
 * ancestrais: um card `h-[600px]` com lista interna reporta `bottom=908` para
 * itens que o usuário nunca vê. Medir overlap apenas pelo `rect` bruto acusa
 * "conteúdo coberto pela BottomNav" que na verdade está recortado pelo próprio
 * container de rolagem.
 *
 * Funções não cruzam a fronteira Node→browser por closure, então o helper
 * exporta o FONTE da função (`EFFECTIVE_RECT_SRC`). Para usar dentro de um
 * `page.evaluate`:
 *
 *   const effectiveRect = new Function('return ' + clipSrc.trim())() as EffectiveRectFn;
 *
 * O `.trim()` é obrigatório: `'return ' + '\n(...)'` dispara ASI (o `return`
 * encerra na quebra de linha) e devolve `undefined` em vez da função.
 */

export interface EffectiveRect {
  top: number;
  bottom: number;
  height: number;
  width: number;
  /** True quando sobra área positiva após todos os recortes. */
  visible: boolean;
}

export type EffectiveRectFn = (el: Element, viewportHeight: number) => EffectiveRect;

/**
 * Interseção do `rect` do elemento com a caixa de conteúdo de cada ancestral
 * que estabelece clipping, limitada à viewport.
 */
export const effectiveRect: EffectiveRectFn = (el, viewportHeight) => {
  const own = el.getBoundingClientRect();
  let top = own.top;
  let bottom = own.bottom;
  let left = own.left;
  let right = own.right;

  let node: Element | null = el.parentElement;
  while (node && node !== document.documentElement) {
    const cs = window.getComputedStyle(node);
    const clipsY = cs.overflowY !== 'visible';
    const clipsX = cs.overflowX !== 'visible';
    if (clipsY || clipsX) {
      const box = node.getBoundingClientRect();
      if (clipsY) {
        top = Math.max(top, box.top + (parseFloat(cs.borderTopWidth) || 0));
        bottom = Math.min(bottom, box.bottom - (parseFloat(cs.borderBottomWidth) || 0));
      }
      if (clipsX) {
        left = Math.max(left, box.left + (parseFloat(cs.borderLeftWidth) || 0));
        right = Math.min(right, box.right - (parseFloat(cs.borderRightWidth) || 0));
      }
    }
    node = node.parentElement;
  }

  top = Math.max(top, 0);
  bottom = Math.min(bottom, viewportHeight);

  const height = bottom - top;
  const width = right - left;

  return { top, bottom, height, width, visible: height > 1 && width > 1 };
};

/** Fonte serializável de `effectiveRect`, para uso dentro de `page.evaluate`. */
export const EFFECTIVE_RECT_SRC = effectiveRect.toString();
