import type { MapMarkerStatus } from '@/lib/emap/floorPlanGeometry';
import type { Suppression, SuppressionReason } from '@/lib/emap/statusAlertPolicy';

/**
 * Onda 165 — livro dos avisos que o mapa decidiu NÃO mostrar.
 *
 * A Onda 163 deu ao mapa o direito de calar. Todo mecanismo que cala precisa
 * prestar contas: se o operador não vê o que foi engolido, o anti-ruído deixa
 * de ser proteção e vira ponto cego. Este módulo é o contrapeso — ele registra
 * cada supressão e permite exibi-la em um painel de transparência.
 *
 * Decisões de projeto (cada uma nasce de uma falha prevista):
 *
 *   1. **Só supressão de agravamento entra no livro.** `improved` (melhorou) e
 *      `not_primed` (estado do mundo na abertura da página) não são avisos
 *      retidos — nada foi escondido. Contá-los inflaria o painel com ruído e
 *      faria o operador ignorar justamente o que importa.
 *   2. **O livro esquece.** Sem janela de retenção, uma câmera instável às 3h
 *      da manhã ainda apareceria no painel às 18h como se fosse atual. Cada
 *      registro expira por relógio (`now` sempre por parâmetro).
 *   3. **Teto por câmera.** Uma câmera em oscilação violenta pode gerar
 *      milhares de supressões por hora; guardamos apenas as mais recentes para
 *      que o livro não cresça sem limite dentro da aba do navegador.
 *   4. **Pureza e identidade.** Nada muda? Devolve a mesma referência — o React
 *      não re-renderiza o painel à toa a cada pulso de tempo real.
 *   5. **Relógio inválido é inerte.** `NaN`/`Infinity` nunca corrompem o livro;
 *      a entrada é descartada, jamais gravada com carimbo impossível.
 */

/** Motivos que representam um aviso efetivamente retido do operador. */
export const WITHHELD_REASONS: readonly SuppressionReason[] = [
  'cooldown',
  'flapping',
  'folded_into_burst',
];

const WITHHELD = new Set<SuppressionReason>(WITHHELD_REASONS);

/** Verdadeiro quando o motivo escondeu um agravamento real do operador. */
export const isWithheld = (reason: SuppressionReason): boolean => WITHHELD.has(reason);

export interface SuppressionConfig {
  /** Tempo que um registro permanece no livro. */
  retentionMs: number;
  /** Máximo de registros guardados por câmera (os mais recentes vencem). */
  maxPerCamera: number;
}

export const DEFAULT_SUPPRESSION_CONFIG: SuppressionConfig = {
  retentionMs: 900_000, // 15 min
  maxPerCamera: 50,
};

export interface SuppressionEvent {
  reason: SuppressionReason;
  at: number;
}

export interface SuppressionLedger {
  /** Registros vivos por câmera, do mais antigo para o mais recente. */
  readonly cameras: Readonly<Record<string, readonly SuppressionEvent[]>>;
}

export const emptySuppressionLedger = (): SuppressionLedger => ({ cameras: {} });

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isUsableId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

function prunedList(
  events: readonly SuppressionEvent[],
  now: number,
  config: SuppressionConfig,
): readonly SuppressionEvent[] {
  const retention = isFiniteNumber(config.retentionMs) && config.retentionMs > 0
    ? config.retentionMs
    : DEFAULT_SUPPRESSION_CONFIG.retentionMs;
  const cap =
    Number.isInteger(config.maxPerCamera) && config.maxPerCamera > 0
      ? config.maxPerCamera
      : DEFAULT_SUPPRESSION_CONFIG.maxPerCamera;

  const alive = events.filter((event) => now - event.at <= retention && now - event.at >= 0);
  return alive.length > cap ? alive.slice(alive.length - cap) : alive;
}

const sameList = (a: readonly SuppressionEvent[], b: readonly SuppressionEvent[]): boolean =>
  a.length === b.length && a.every((event, index) => event === b[index]);

/**
 * Remove registros vencidos. Idempotente: aplicar duas vezes com o mesmo
 * `now` devolve exatamente a mesma referência na segunda chamada.
 */
export function pruneSuppressions(
  ledger: SuppressionLedger,
  now: number,
  config: SuppressionConfig = DEFAULT_SUPPRESSION_CONFIG,
): SuppressionLedger {
  if (!isFiniteNumber(now)) return ledger;

  const cameras: Record<string, readonly SuppressionEvent[]> = {};
  let changed = false;

  for (const [cameraId, events] of Object.entries(ledger.cameras)) {
    const next = prunedList(events, now, config);
    if (next.length === 0) {
      changed = true;
      continue;
    }
    if (!sameList(next, events)) changed = true;
    cameras[cameraId] = next;
  }

  return changed ? { cameras } : ledger;
}

/**
 * Grava uma leva de supressões. Motivos que não escondem agravamento são
 * ignorados por projeto (ver decisão 1 no cabeçalho).
 */
export function recordSuppressions(
  ledger: SuppressionLedger,
  suppressions: readonly Suppression[],
  now: number,
  config: SuppressionConfig = DEFAULT_SUPPRESSION_CONFIG,
): SuppressionLedger {
  if (!isFiniteNumber(now)) return ledger;

  const additions = new Map<string, SuppressionEvent[]>();
  for (const suppression of suppressions ?? []) {
    const cameraId = suppression?.cameraId;
    const reason = suppression?.reason;
    if (!isUsableId(cameraId) || !isWithheld(reason)) continue;
    const bucket = additions.get(cameraId);
    if (bucket) bucket.push({ reason, at: now });
    else additions.set(cameraId, [{ reason, at: now }]);
  }

  const pruned = pruneSuppressions(ledger, now, config);
  if (additions.size === 0) return pruned;

  const cameras: Record<string, readonly SuppressionEvent[]> = { ...pruned.cameras };
  for (const [cameraId, events] of additions) {
    const existing = cameras[cameraId] ?? [];
    cameras[cameraId] = prunedList([...existing, ...events], now, config);
  }
  return { cameras };
}

/** Apaga o histórico de uma câmera — usado quando o operador reconhece o ruído. */
export function clearCameraSuppressions(
  ledger: SuppressionLedger,
  cameraId: string,
): SuppressionLedger {
  if (!isUsableId(cameraId) || !ledger.cameras[cameraId]) return ledger;
  const cameras = { ...ledger.cameras };
  delete cameras[cameraId];
  return { cameras };
}

export interface SuppressionCameraSummary {
  cameraId: string;
  total: number;
  byReason: Readonly<Record<SuppressionReason, number>>;
  firstAt: number;
  lastAt: number;
  /** Motivo do registro mais recente — o que está calando a câmera agora. */
  dominantReason: SuppressionReason;
}

export interface SuppressionSummary {
  total: number;
  cameras: readonly SuppressionCameraSummary[];
}

const zeroCounts = (): Record<SuppressionReason, number> => ({
  not_primed: 0,
  improved: 0,
  cooldown: 0,
  flapping: 0,
  folded_into_burst: 0,
});

/**
 * Resumo pronto para exibição: câmera mais barulhenta primeiro, empate
 * resolvido pelo registro mais recente e depois pelo identificador, para que a
 * lista nunca se reordene sozinha entre dois renders idênticos.
 */
export function summarizeSuppressions(
  ledger: SuppressionLedger,
  now: number,
  config: SuppressionConfig = DEFAULT_SUPPRESSION_CONFIG,
): SuppressionSummary {
  const source = isFiniteNumber(now) ? pruneSuppressions(ledger, now, config) : ledger;

  const cameras: SuppressionCameraSummary[] = [];
  let total = 0;

  for (const [cameraId, events] of Object.entries(source.cameras)) {
    if (events.length === 0) continue;
    const byReason = zeroCounts();
    let firstAt = Number.POSITIVE_INFINITY;
    let lastAt = Number.NEGATIVE_INFINITY;
    let dominantReason: SuppressionReason = 'cooldown';

    for (const event of events) {
      byReason[event.reason] += 1;
      if (event.at < firstAt) firstAt = event.at;
      if (event.at >= lastAt) {
        lastAt = event.at;
        dominantReason = event.reason;
      }
    }

    total += events.length;
    cameras.push({ cameraId, total: events.length, byReason, firstAt, lastAt, dominantReason });
  }

  cameras.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.lastAt !== a.lastAt) return b.lastAt - a.lastAt;
    return a.cameraId.localeCompare(b.cameraId);
  });

  return { total, cameras };
}

const REASON_LABEL: Record<SuppressionReason, string> = {
  not_primed: 'estado já existente na abertura',
  improved: 'melhora (não interrompe)',
  cooldown: 'aviso repetido em pouco tempo',
  flapping: 'câmera oscilando',
  folded_into_burst: 'agrupado em aviso coletivo',
};

/** Texto curto e sem jargão do motivo do silêncio. */
export const describeSuppressionReason = (reason: SuppressionReason): string =>
  REASON_LABEL[reason] ?? 'motivo desconhecido';

/**
 * Cor semântica sugerida para o motivo. Devolve apenas o nome do estado do
 * mapa; a escolha de token fica com a camada de apresentação.
 */
export const suppressionSeverity = (reason: SuppressionReason): MapMarkerStatus =>
  reason === 'flapping' ? 'warning' : 'unknown';
