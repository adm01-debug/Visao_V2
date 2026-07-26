/**
 * Onda 137 — regra única de exibição dos contadores da navegação.
 *
 * ## O defeito que este módulo corrige
 *
 * A sidebar decidia se um contador aparece com `Number(item.badge) > 0`. Isso
 * funciona para número, mas descarta silenciosamente qualquer rótulo textual:
 *
 *   Number("5/10")  → NaN → NaN > 0 é `false`  → badge some
 *   Number("99+")   → NaN → some
 *   Number("")      → 0   → some (correto, por acidente)
 *
 * O contador `${online}/${total}` de Câmeras — configurado desde sempre em
 * `categories.ts` — nunca foi renderizado por causa disso. O bug é invisível
 * porque a ausência de um badge não parece um erro; parece "não tem nada a
 * mostrar". Uma tela que engole informação de disponibilidade da frota é
 * exatamente o tipo de silêncio que este projeto combate no backend.
 *
 * A regra correta separa dois conceitos que estavam fundidos:
 *
 *  - **número** é uma contagem: `0` significa "nada pendente" e deve sumir;
 *  - **texto** é um rótulo já formatado por quem o produziu: aparece se não for
 *    vazio, sem tentar interpretá-lo como número.
 *
 * Invariantes varridas pelos testes:
 *   N1 número finito > 0 sempre renderiza; <= 0, NaN ou infinito nunca
 *   N2 texto não vazio (após trim) sempre renderiza, numérico ou não
 *   N3 formatar nunca devolve string vazia quando `shouldRenderNavBadge` é true
 *   N4 a formatação preserva o texto original de rótulos textuais
 *   N5 números acima do teto viram `"<teto>+"` e nunca estouram a largura
 */

/** Teto de exibição: acima disso o valor exato deixa de importar para o olho. */
export const NAV_BADGE_MAX = 99;

export type NavBadgeValue = number | string | undefined | null;

/**
 * Decide se o contador deve ocupar espaço na navegação.
 *
 * Número: só conta o que é finito e positivo — `0`, negativos, `NaN` e
 * `Infinity` representam "sem informação útil" e não devem virar pixel.
 * Texto: qualquer conteúdo não vazio é intencional e é exibido como veio.
 */
export function shouldRenderNavBadge(badge: NavBadgeValue): boolean {
  if (badge === undefined || badge === null) return false;
  if (typeof badge === 'number') return Number.isFinite(badge) && badge > 0;
  return badge.trim().length > 0;
}

/**
 * Texto final do contador. Só faz sentido chamar quando
 * `shouldRenderNavBadge` é verdadeiro; para os demais casos devolve `""` para
 * que um uso indevido apareça como vazio e não como `"NaN"` ou `"undefined"`.
 */
export function formatNavBadge(badge: NavBadgeValue, max: number = NAV_BADGE_MAX): string {
  if (badge === undefined || badge === null) return '';
  if (typeof badge === 'number') {
    if (!Number.isFinite(badge) || badge <= 0) return '';
    const cap = Number.isFinite(max) && max > 0 ? Math.floor(max) : NAV_BADGE_MAX;
    return badge > cap ? `${cap}+` : String(Math.floor(badge));
  }
  return badge.trim();
}
