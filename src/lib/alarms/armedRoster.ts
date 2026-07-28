/**
 * Onda 224 — Painel do "agora": contagem e filtro por estado de armamento.
 *
 * A Onda 223 respondeu "este esquema está armado agora?". Falta a pergunta do
 * supervisor: **quantos, e quais?** Este módulo é a regra única disso.
 *
 * Leis:
 *  R1. **Uma avaliação por esquema por tique.** O contador do cabeçalho e a
 *      coluna da tabela leem o MESMO veredito. Duas avaliações independentes
 *      no mesmo render podem cair em lados opostos da virada do minuto e o
 *      painel diria "3 armados" listando 2.
 *  R2. A contagem é uma **partição exata**: a soma dos baldes é igual ao total.
 *      Nenhum esquema fica de fora, nenhum é contado duas vezes.
 *  R3. O balde "armados agora" inclui `armed_degraded` — é vigilância que está
 *      de fato valendo, com ressalva. Excluí-la faria o painel subnotificar
 *      cobertura real. A ressalva é mostrada separada, nunca subtraída.
 *  R4. Filtrar **nunca reordena**: a ordem de entrada é preservada. Lista que
 *      se reorganiza sozinha faz o operador perder a linha que estava lendo.
 *  R5. Resultado vazio por filtro é diferente de cadastro vazio, e o motivo é
 *      declarado por quem consome (`isFiltered`).
 *  R6. `unknown` (relógio impossível) não entra em "armados" nem em "fora da
 *      janela". Tem balde próprio: ausência de informação não é evidência.
 */

import { evaluateArmedNow, type ArmedInput, type ArmedVerdict } from './armedNow';

export type ArmedFilter = 'all' | 'armed' | 'attention' | 'off';

export interface RosterCounts {
  /** Vigilância valendo agora (inclui degradado — R3). */
  readonly armed: number;
  /** Subconjunto de `armed` que está com ressalva. Nunca subtraído. */
  readonly degraded: number;
  readonly idle: number;
  readonly off: number;
  readonly inoperative: number;
  readonly unknown: number;
  readonly total: number;
}

export interface RosterEntry<T> {
  readonly id: string;
  readonly item: T;
  readonly verdict: ArmedVerdict;
}

export interface ArmedRoster<T> {
  readonly entries: readonly RosterEntry<T>[];
  readonly counts: RosterCounts;
}

const EMPTY_COUNTS: RosterCounts = {
  armed: 0,
  degraded: 0,
  idle: 0,
  off: 0,
  inoperative: 0,
  unknown: 0,
  total: 0,
};

/**
 * Avalia todos os esquemas **uma única vez** (R1) e devolve os vereditos junto
 * das contagens. Quem consome nunca deve reavaliar por conta própria.
 */
export function buildArmedRoster<T>(
  items: readonly T[],
  select: (item: T) => { id: string; input: ArmedInput },
  at: number,
  tzOffsetMinutes = 0,
): ArmedRoster<T> {
  const entries: RosterEntry<T>[] = [];
  const counts = { ...EMPTY_COUNTS };

  for (const item of items) {
    const { id, input } = select(item);
    const verdict = evaluateArmedNow(input, at, tzOffsetMinutes);
    entries.push({ id, item, verdict });

    counts.total += 1;
    switch (verdict.state) {
      case 'armed':
        counts.armed += 1;
        break;
      case 'armed_degraded':
        counts.armed += 1;
        counts.degraded += 1;
        break;
      case 'idle':
        counts.idle += 1;
        break;
      case 'off':
        counts.off += 1;
        break;
      case 'inoperative':
        counts.inoperative += 1;
        break;
      default:
        // R6 — indeterminado tem balde próprio.
        counts.unknown += 1;
    }
  }

  return { entries, counts };
}

/**
 * Aplica o filtro preservando a ordem (R4).
 *
 * - `armed`     → vigilância valendo agora (inclui a ressalva).
 * - `attention` → o que exige alguém: inoperante, degradado e indeterminado.
 * - `off`       → desabilitado ou fora da janela (nada valendo, por projeto).
 */
export function filterRoster<T>(
  entries: readonly RosterEntry<T>[],
  filter: ArmedFilter,
): readonly RosterEntry<T>[] {
  if (filter === 'all') return entries;
  return entries.filter(({ verdict }) => {
    switch (filter) {
      case 'armed':
        return verdict.effective;
      case 'attention':
        return (
          verdict.state === 'inoperative' ||
          verdict.state === 'armed_degraded' ||
          verdict.state === 'unknown' ||
          verdict.unreachable
        );
      case 'off':
        return verdict.state === 'off' || verdict.state === 'idle';
      default:
        return true;
    }
  });
}

/** Quantos itens o filtro exibiria — sem materializar a lista. */
export function countForFilter<T>(
  entries: readonly RosterEntry<T>[],
  filter: ArmedFilter,
): number {
  return filterRoster(entries, filter).length;
}

/** Rótulo humano do filtro, para botões e para o estado vazio (R5). */
export const filterLabel = (filter: ArmedFilter): string => {
  switch (filter) {
    case 'armed':
      return 'Armados agora';
    case 'attention':
      return 'Exigem atenção';
    case 'off':
      return 'Sem vigilância';
    default:
      return 'Todos';
  }
};
