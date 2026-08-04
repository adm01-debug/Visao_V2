/**
 * Onda 171 — fila de triagem do E-Map ("o que eu atendo agora?").
 *
 * O mapa já diz o que está errado (162), o que piorou (164), para qual andar
 * olhar (167), há quanto tempo está assim (168) e o que entregar no fim do
 * turno (169/170). Falta a pergunta que decide a próxima ação humana:
 * **qual destas pendências eu pego primeiro?**
 *
 * Ordenar só por gravidade condena a dívida antiga à inanição: um `warning`
 * aberto há seis horas fica eternamente atrás de `unknown` recém-nascidos.
 * Ordenar só por idade inverte a mesa: um alarme de agora esperaria atrás de
 * um "sem estado" da madrugada. A fila abaixo é o meio-termo auditável.
 *
 * Regras invioláveis (cada uma existe porque a alternativa mente):
 *
 *  1. **Gravidade é o eixo primário.** Idade nunca reordena por conta própria.
 *  2. **Dívida promove no máximo UM degrau.** Uma pendência `prolonged` sobe
 *     um nível de prioridade — e só. Promoção nunca cria/alcança o topo
 *     (`alert`): tempo não transforma aviso em alarme, apenas o aproxima.
 *  3. **Reconhecer não é resolver.** "Ciente" manda o item para o fim da fila,
 *     mas ele JAMAIS desaparece nem perde a idade (espelha a Onda 169).
 *  4. **Sem lugar conhecido não é sem existência.** Câmera fora de qualquer
 *     planta entra na fila como `planId: null` — nunca é descartada.
 *  5. **Ordem total e determinística.** Empates caem em `cameraId` crescente;
 *     duas chamadas com a mesma entrada produzem exatamente a mesma fila.
 *  6. **Teto de exibição nunca corrompe contagem.** `items` pode ser cortado;
 *     `totals` é sempre absoluto e `dropped` declara o que ficou de fora.
 *  7. **Puro e imutável.** Sem `Date.now()`, sem rede, sem DOM, sem mutação
 *     das estruturas recebidas.
 */

import {
  attentionAge,
  bandOf,
  statusAge,
  DEFAULT_BAND_CONFIG,
  type AttentionBand,
  type AttentionBandConfig,
  type AttentionEntry,
  type AttentionLedger,
} from './attentionClock';
import { severityRank, worstStatus, type MapMarkerStatus } from './floorPlanGeometry';

/** Prioridade mais alta que a promoção por idade pode alcançar. */
const PROMOTION_CEILING = severityRank('offline');

/** Onde a câmera vive fisicamente, quando sabemos. */
export interface TriagePlace {
  planId: string;
  planName: string;
}

export type TriageLocator = (cameraId: string) => TriagePlace | null | undefined;

export interface TriageItem {
  cameraId: string;
  status: MapMarkerStatus;
  /** Pior estado da janela contínua de atenção (nunca "esquecido"). */
  worst: MapMarkerStatus;
  /** Prioridade efetiva (menor = atende antes), já com promoção aplicada. */
  tier: number;
  /** Prioridade antes da promoção por dívida — mantida para auditoria. */
  baseTier: number;
  promoted: boolean;
  band: AttentionBand;
  attentionAgeMs: number;
  statusAgeMs: number;
  changes: number;
  planId: string | null;
  planName: string | null;
  onActivePlan: boolean;
  acknowledged: boolean;
  /** Motivo curto e legível da posição — a fila precisa se explicar. */
  reason: string;
}

export interface TriagePlanBucket {
  planId: string | null;
  planName: string;
  count: number;
  worst: MapMarkerStatus;
  /** Pendências ainda não reconhecidas neste andar. */
  open: number;
}

export interface TriageTotals {
  /** Tudo que está na fila (reconhecido inclusive). */
  total: number;
  /** Ainda não reconhecido — é este número que mede trabalho pendente. */
  open: number;
  acknowledged: number;
  promoted: number;
  /** Pendências sem planta conhecida. */
  offPlan: number;
  byBand: Record<AttentionBand, number>;
  byPlan: readonly TriagePlanBucket[];
}

export interface TriageQueue {
  /** Fila já ordenada e cortada pelo teto de exibição. */
  items: readonly TriageItem[];
  /** Contagens absolutas — nunca afetadas pelo teto (regra 6). */
  totals: TriageTotals;
  /** Quantos itens ficaram fora de `items`. */
  dropped: number;
  /** Primeiro item não reconhecido, se houver: a próxima ação sugerida. */
  next: TriageItem | null;
}

export interface TriageInput {
  ledger: AttentionLedger;
  now: number;
  locate?: TriageLocator;
  /** Câmeras já marcadas como "ciente" pelo operador. */
  acknowledged?: Iterable<string>;
  activePlanId?: string | null;
  bandConfig?: AttentionBandConfig;
  /** Teto de linhas retornadas em `items`. `0` devolve fila vazia com totais. */
  limit?: number;
}

const emptyTotals = (): TriageTotals => ({
  total: 0,
  open: 0,
  acknowledged: 0,
  promoted: 0,
  offPlan: 0,
  byBand: { fresh: 0, sustained: 0, prolonged: 0 },
  byPlan: [],
});

export const emptyTriageQueue = (): TriageQueue => ({
  items: [],
  totals: emptyTotals(),
  dropped: 0,
  next: null,
});

const toSet = (values: Iterable<string> | undefined): ReadonlySet<string> => {
  if (!values) return new Set<string>();
  if (values instanceof Set) return values as ReadonlySet<string>;
  return new Set(values);
};

const BAND_REASON: Record<AttentionBand, string> = {
  fresh: 'aberto agora',
  sustained: 'sem tratativa',
  prolonged: 'dívida antiga',
};

const STATUS_REASON: Record<MapMarkerStatus, string> = {
  alert: 'alarme',
  offline: 'fora do ar',
  warning: 'aviso',
  unknown: 'sem estado',
  online: 'operando',
};

function reasonOf(
  status: MapMarkerStatus,
  band: AttentionBand,
  promoted: boolean,
  acknowledged: boolean
): string {
  const parts = [STATUS_REASON[status], BAND_REASON[band]];
  if (promoted) parts.push('promovido por tempo');
  if (acknowledged) parts.push('ciente, aguardando solução');
  return parts.join(' · ');
}

/**
 * Prioridade efetiva de uma entrada.
 *
 * A promoção é limitada a um degrau (regra 2) e travada em `PROMOTION_CEILING`
 * para que nenhuma espera transforme um aviso em alarme.
 */
export function triageTier(
  entry: AttentionEntry,
  band: AttentionBand
): { tier: number; baseTier: number; promoted: boolean } {
  const baseTier = severityRank(entry.status);
  if (band !== 'prolonged') return { tier: baseTier, baseTier, promoted: false };
  const promotedTier = Math.max(baseTier - 1, PROMOTION_CEILING);
  return { tier: promotedTier, baseTier, promoted: promotedTier !== baseTier };
}

/** Comparador total e estável da fila. Exportado para o gate de simulação. */
export function compareTriage(a: TriageItem, b: TriageItem): number {
  // Regra 3: reconhecido sempre depois — em qualquer gravidade.
  if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
  if (a.tier !== b.tier) return a.tier - b.tier;
  if (a.attentionAgeMs !== b.attentionAgeMs) return b.attentionAgeMs - a.attentionAgeMs;
  return a.cameraId < b.cameraId ? -1 : a.cameraId > b.cameraId ? 1 : 0;
}

/**
 * Monta a fila de triagem a partir do relógio de atenção.
 *
 * Nunca lança: relógio inválido devolve fila vazia (com totais zerados) em vez
 * de uma ordem inventada.
 */
export function buildTriageQueue(input: TriageInput): TriageQueue {
  const { ledger, now } = input;
  if (!Number.isFinite(now)) return emptyTriageQueue();

  const bandConfig = input.bandConfig ?? DEFAULT_BAND_CONFIG;
  const acknowledged = toSet(input.acknowledged);
  const activePlanId = input.activePlanId ?? null;
  const locate = input.locate;

  const all: TriageItem[] = [];
  const totals = emptyTotals();
  const buckets = new Map<
    string,
    { planId: string | null; planName: string; statuses: MapMarkerStatus[]; open: number }
  >();

  for (const entry of Object.values(ledger)) {
    if (!entry || typeof entry.cameraId !== 'string' || entry.cameraId.length === 0) continue;

    const band = bandOf(entry, now, bandConfig);
    const isAcknowledged = acknowledged.has(entry.cameraId);
    const { tier, baseTier, promoted } = triageTier(entry, band);

    // Regra 4: locator ruidoso (throw/undefined) nunca derruba a fila.
    let place: TriagePlace | null = null;
    if (locate) {
      try {
        place = locate(entry.cameraId) ?? null;
      } catch {
        place = null;
      }
    }

    const item: TriageItem = {
      cameraId: entry.cameraId,
      status: entry.status,
      worst: entry.worst,
      tier,
      baseTier,
      promoted,
      band,
      attentionAgeMs: attentionAge(entry, now),
      statusAgeMs: statusAge(entry, now),
      changes: entry.changes,
      planId: place?.planId ?? null,
      planName: place?.planName ?? null,
      onActivePlan: place != null && activePlanId != null && place.planId === activePlanId,
      acknowledged: isAcknowledged,
      reason: reasonOf(entry.status, band, promoted, isAcknowledged),
    };

    all.push(item);

    totals.total += 1;
    totals.byBand[band] += 1;
    if (isAcknowledged) totals.acknowledged += 1;
    else totals.open += 1;
    if (promoted) totals.promoted += 1;
    if (!place) totals.offPlan += 1;

    const key = place?.planId ?? '\u0000sem-planta';
    const bucket = buckets.get(key) ?? {
      planId: place?.planId ?? null,
      planName: place?.planName ?? 'Sem planta',
      statuses: [],
      open: 0,
    };
    bucket.statuses.push(entry.status);
    if (!isAcknowledged) bucket.open += 1;
    buckets.set(key, bucket);
  }

  all.sort(compareTriage);

  totals.byPlan = Array.from(buckets.values())
    .map((bucket) => ({
      planId: bucket.planId,
      planName: bucket.planName,
      count: bucket.statuses.length,
      worst: worstStatus(bucket.statuses),
      open: bucket.open,
    }))
    .sort((a, b) => {
      const bySeverity = severityRank(a.worst) - severityRank(b.worst);
      if (bySeverity !== 0) return bySeverity;
      if (a.count !== b.count) return b.count - a.count;
      return a.planName < b.planName ? -1 : a.planName > b.planName ? 1 : 0;
    });

  const rawLimit = input.limit;
  const limit =
    typeof rawLimit === 'number' && Number.isFinite(rawLimit) && rawLimit >= 0
      ? Math.floor(rawLimit)
      : all.length;
  const items = limit >= all.length ? all : all.slice(0, limit);

  return {
    items,
    totals,
    dropped: all.length - items.length,
    next: all.find((item) => !item.acknowledged) ?? null,
  };
}
