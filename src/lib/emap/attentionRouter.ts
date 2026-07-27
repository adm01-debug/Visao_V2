/**
 * Onda 167 — guia de atenção entre andares (cross-floor attention).
 *
 * Problema real de mesa de operação: o operador está olhando o 3º andar
 * enquanto o alarme está no subsolo. O seletor de plantas (Onda 166) já mostra
 * o pior estado de cada andar, mas exige que alguém varra a barra com os olhos.
 * Este módulo transforma isso numa recomendação única e explícita.
 *
 * Princípios (herdados das ondas 162–166 e mantidos aqui sem exceção):
 * - NUNCA navegar sozinho. O mapa é ferramenta de decisão humana; trocar a
 *   planta debaixo do dedo do operador durante uma ocorrência é pior que o
 *   ruído que se pretende evitar. Aqui só se produz um convite.
 * - Só convida quem é ESTRITAMENTE mais grave que a planta atual. Se o
 *   operador já está no pior andar, não há para onde mandá-lo.
 * - `unknown` nunca gera convite. Ausência de prova não é emergência (mas
 *   também nunca é apresentada como normalidade — isso é papel do rótulo).
 * - Dispensa é por "estado dispensado", não por planta: o operador dispensa
 *   "subsolo em 2 offline"; se virar alarme, ou se o número de câmeras em
 *   atenção crescer, o convite volta. Só piora reavisa.
 * - Ordem estável: entre iguais vence a maior contagem em atenção e, no
 *   empate, a ordem original da lista — o convite não pode ficar oscilando
 *   entre dois andares idênticos a cada render.
 * - Função pura: sem relógio, sem rede, sem DOM.
 */

import { isWorseThan, severityRank, type MapMarkerStatus } from './floorPlanGeometry';
import type { PlanNavItem } from './planNavigator';

/** Estados que justificam mandar o operador para outro andar. */
const ROUTABLE: ReadonlySet<MapMarkerStatus> = new Set<MapMarkerStatus>(['alert', 'offline']);

/** Registro de uma dispensa feita pelo operador. */
export interface AttentionDismissal {
  planId: string;
  /** Gravidade no momento da dispensa. */
  severity: MapMarkerStatus;
  /** Câmeras em atenção no momento da dispensa. */
  attention: number;
}

export type DismissalLedger = readonly AttentionDismissal[];

export interface AttentionAdvice {
  /** Planta recomendada, ou `null` quando não há nada mais grave em aberto. */
  target: PlanNavItem | null;
  /** Todos os andares mais graves que o atual, já ordenados (inclui o alvo). */
  candidates: readonly PlanNavItem[];
  /** Candidatos suprimidos por dispensa ainda válida. */
  dismissed: readonly PlanNavItem[];
  /** Gravidade da planta atualmente exibida (referência da comparação). */
  activeSeverity: MapMarkerStatus;
}

const rankOf = (item: PlanNavItem): number => severityRank(item.worst);

/**
 * Ordena candidatos: mais grave primeiro, depois maior contagem em atenção,
 * depois a ordem original (índice) — determinístico em qualquer render.
 */
function sortCandidates(items: readonly PlanNavItem[]): PlanNavItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const bySeverity = rankOf(a.item) - rankOf(b.item);
      if (bySeverity !== 0) return bySeverity;
      const byAttention = b.item.attention - a.item.attention;
      if (byAttention !== 0) return byAttention;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

/**
 * Uma dispensa cobre o item enquanto ele não piorar: mesma planta, gravidade
 * não mais grave que a dispensada e contagem em atenção que não cresceu.
 */
export function isDismissed(ledger: DismissalLedger | null | undefined, item: PlanNavItem): boolean {
  for (const entry of ledger ?? []) {
    if (!entry || entry.planId !== item.planId) continue;
    if (isWorseThan(item.worst, entry.severity)) return false;
    if (item.attention > (Number.isFinite(entry.attention) ? entry.attention : 0)) return false;
    return true;
  }
  return false;
}

/** Registra (ou atualiza) a dispensa de um andar, mantendo uma entrada por planta. */
export function recordDismissal(
  ledger: DismissalLedger | null | undefined,
  item: PlanNavItem,
): DismissalLedger {
  const kept = (ledger ?? []).filter((entry) => entry && entry.planId !== item.planId);
  return [
    ...kept,
    {
      planId: item.planId,
      severity: item.worst,
      attention: Math.max(0, Math.trunc(item.attention) || 0),
    },
  ];
}

/** Remove dispensas de plantas que sumiram da lista (planta apagada/renomeada). */
export function pruneDismissals(
  ledger: DismissalLedger | null | undefined,
  items: readonly PlanNavItem[] | null | undefined,
): DismissalLedger {
  const alive = new Set((items ?? []).map((item) => item.planId));
  return (ledger ?? []).filter((entry) => entry && alive.has(entry.planId));
}

export interface AdviseInput {
  items: readonly PlanNavItem[] | null | undefined;
  activePlanId: string | null | undefined;
  dismissals?: DismissalLedger | null;
}

/**
 * Regra única do convite entre andares.
 *
 * Quando não há planta ativa resolvível, a referência de comparação é
 * `unknown` — assim um alarme em qualquer andar ainda convida, mas um andar
 * apenas "online" nunca vira convite.
 */
export function adviseCrossFloorAttention(input: AdviseInput): AttentionAdvice {
  const { items, activePlanId, dismissals } = input ?? {};
  const list = (items ?? []).filter((item): item is PlanNavItem => Boolean(item?.planId));

  const active = list.find((item) => item.planId === activePlanId);
  const activeSeverity: MapMarkerStatus = active ? active.worst : 'unknown';

  const worseElsewhere = list.filter(
    (item) =>
      item.planId !== active?.planId &&
      ROUTABLE.has(item.worst) &&
      item.attention > 0 &&
      isWorseThan(item.worst, activeSeverity),
  );

  const ordered = sortCandidates(worseElsewhere);
  const visible = ordered.filter((item) => !isDismissed(dismissals, item));
  const hidden = ordered.filter((item) => isDismissed(dismissals, item));

  return {
    target: visible[0] ?? null,
    candidates: visible,
    dismissed: hidden,
    activeSeverity,
  };
}

/** Frase curta e sem exagero para o convite. */
export function describeAttentionAdvice(advice: AttentionAdvice): string | null {
  const target = advice.target;
  if (!target) return null;
  const what = target.worst === 'alert' ? 'em alarme' : 'sem comunicação';
  const plural = target.attention === 1 ? 'câmera' : 'câmeras';
  const extra = advice.candidates.length - 1;
  const tail = extra > 0 ? ` (+${extra} ${extra === 1 ? 'andar' : 'andares'})` : '';
  return `${target.name}: ${target.attention} ${plural} ${what}${tail}`;
}
