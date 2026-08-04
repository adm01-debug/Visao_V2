/**
 * Onda 168 — relógio de atenção (há quanto tempo isto está assim).
 *
 * O E-Map já diz *o que* está errado (Onda 162), *o que acabou de piorar*
 * (Onda 164) e *para qual andar olhar* (Onda 167). Falta a pergunta que o
 * operador de mesa faz o tempo todo e que nenhum marcador respondia:
 * **há quanto tempo?**
 *
 * Uma câmera offline há 40 segundos é um reboot. A mesma câmera offline há
 * quatro horas é um incidente que ninguém tratou. O ícone é idêntico nos dois
 * casos — e é exatamente por isso que o segundo caso apodrece na tela.
 *
 * Regras (invioláveis, e cada uma existe porque a alternativa mente):
 *
 *  1. **Renovação não reinicia o relógio.** Ver de novo o mesmo estado é
 *     confirmação, não fato novo. Reiniciar aqui esconderia justamente o
 *     problema crônico — o pior tipo de mentira que um painel pode contar.
 *  2. **Melhora zera.** Câmera que voltou a operar não tem idade de atenção.
 *     Guardar o "histórico" no relógio confundiria dívida com ocorrência.
 *  3. **Troca de estado dentro da atenção reinicia a contagem do estado**,
 *     mas preserva a **abertura** (`openedAt`): "offline há 3min, em atenção
 *     contínua há 22min" são dois fatos verdadeiros e diferentes.
 *  4. **Ausência não é melhora.** Câmera que sumiu da observação (filtro,
 *     troca de planta, falha de rede) mantém o relógio correndo. Só um
 *     estado saudável observado apaga a entrada.
 *  5. **Relógio inválido não cria entrada eterna.** `NaN`/`Infinity` são
 *     descartados; idade nunca é negativa mesmo com carimbo no futuro.
 *  6. **Puro e imutável.** Sem `Date.now()`, sem rede, sem DOM. Chamada que
 *     não muda nada devolve a mesma referência (barato para o React).
 */

import { severityRank, type MapMarkerStatus } from './floorPlanGeometry';

/** Estados que fazem o relógio correr. `online` é saúde; ele apaga a entrada. */
const ATTENTION: ReadonlySet<MapMarkerStatus> = new Set<MapMarkerStatus>([
  'alert',
  'offline',
  'warning',
  'unknown',
]);

/** Verdadeiro quando o estado exige acompanhamento no tempo. */
export const isAttentionStatus = (status: MapMarkerStatus): boolean => ATTENTION.has(status);

const isFiniteClock = (value: number): boolean => Number.isFinite(value);

export interface AttentionEntry {
  cameraId: string;
  /** Estado atual observado. */
  status: MapMarkerStatus;
  /** Início do estado ATUAL (reinicia quando o estado muda). */
  since: number;
  /** Início da atenção CONTÍNUA (só zera quando a câmera fica saudável). */
  openedAt: number;
  /** Pior estado já visto nesta janela contínua de atenção. */
  worst: MapMarkerStatus;
  /** Quantas trocas de estado ocorreram sem passar por um estado saudável. */
  changes: number;
  /** Última observação que sustentou esta entrada. */
  lastSeen: number;
}

export type AttentionLedger = Readonly<Record<string, AttentionEntry>>;

export const emptyAttentionLedger = (): AttentionLedger => ({});

/** Observação mínima consumida pelo relógio. */
export interface AttentionObservation {
  cameraId: string;
  status: MapMarkerStatus;
}

/**
 * Aplica uma rodada de observações ao livro.
 *
 * Só o que foi observado é atualizado: quem não veio na lista continua com o
 * relógio correndo (regra 4). Estados saudáveis observados removem a entrada.
 */
export function observeAttention(
  ledger: AttentionLedger,
  observations: readonly AttentionObservation[],
  now: number
): AttentionLedger {
  if (!isFiniteClock(now) || observations.length === 0) return ledger;

  let next: Record<string, AttentionEntry> | null = null;
  const mutate = (): Record<string, AttentionEntry> => {
    if (!next) next = { ...ledger };
    return next;
  };

  for (const observation of observations) {
    const cameraId = observation?.cameraId;
    if (typeof cameraId !== 'string' || cameraId.length === 0) continue;
    const status = observation.status;
    const current = ledger[cameraId];

    if (!isAttentionStatus(status)) {
      // Regra 2: melhora zera. Ausência de entrada é o estado saudável.
      if (current) delete mutate()[cameraId];
      continue;
    }

    if (!current) {
      mutate()[cameraId] = {
        cameraId,
        status,
        since: now,
        openedAt: now,
        worst: status,
        changes: 0,
        lastSeen: now,
      };
      continue;
    }

    if (current.status === status) {
      // Regra 1: confirmação apenas move `lastSeen`.
      if (current.lastSeen === now) continue;
      mutate()[cameraId] = { ...current, lastSeen: now };
      continue;
    }

    // Regra 3: novo estado, mesma janela de atenção.
    mutate()[cameraId] = {
      cameraId,
      status,
      since: now,
      openedAt: current.openedAt,
      worst: severityRank(status) < severityRank(current.worst) ? status : current.worst,
      changes: current.changes + 1,
      lastSeen: now,
    };
  }

  return next ?? ledger;
}

/** Remove entradas de câmeras que não existem mais (planta apagada, etc.). */
export function pruneAttention(
  ledger: AttentionLedger,
  knownCameraIds: Iterable<string>
): AttentionLedger {
  const known = knownCameraIds instanceof Set ? knownCameraIds : new Set(knownCameraIds);
  const ids = Object.keys(ledger);
  const survivors = ids.filter((id) => known.has(id));
  if (survivors.length === ids.length) return ledger;
  const next: Record<string, AttentionEntry> = {};
  for (const id of survivors) {
    const entry = ledger[id];
    if (entry) next[id] = entry;
  }
  return next;
}

/** Apaga o relógio de uma câmera (reconhecimento manual do operador). */
export function clearAttention(ledger: AttentionLedger, cameraId: string): AttentionLedger {
  if (!ledger[cameraId]) return ledger;
  const next = { ...ledger };
  delete next[cameraId];
  return next;
}

/** Idade do estado atual, em ms. Nunca negativa (regra 5). */
export function statusAge(entry: AttentionEntry, now: number): number {
  if (!isFiniteClock(now)) return 0;
  return Math.max(0, now - entry.since);
}

/** Idade da janela contínua de atenção, em ms. Nunca negativa. */
export function attentionAge(entry: AttentionEntry, now: number): number {
  if (!isFiniteClock(now)) return 0;
  return Math.max(0, now - entry.openedAt);
}

/** Faixas de idade usadas para priorizar a fila do operador. */
export type AttentionBand = 'fresh' | 'sustained' | 'prolonged';

export interface AttentionBandConfig {
  /** Abaixo disto o fato é recente (provável transitório). */
  freshMs: number;
  /** Abaixo disto é sustentado; acima, prolongado (dívida operacional). */
  sustainedMs: number;
}

export const DEFAULT_BAND_CONFIG: AttentionBandConfig = {
  freshMs: 120_000,
  sustainedMs: 900_000,
};

export function bandOf(
  entry: AttentionEntry,
  now: number,
  config: AttentionBandConfig = DEFAULT_BAND_CONFIG
): AttentionBand {
  const age = attentionAge(entry, now);
  if (age < config.freshMs) return 'fresh';
  if (age < config.sustainedMs) return 'sustained';
  return 'prolonged';
}

/**
 * Fila priorizada: mais grave primeiro; no empate, o mais antigo primeiro;
 * no empate total, ordem alfabética do id — determinístico em todo render.
 */
export function rankAttention(ledger: AttentionLedger, now: number): readonly AttentionEntry[] {
  return Object.values(ledger)
    .slice()
    .sort((a, b) => {
      const bySeverity = severityRank(a.status) - severityRank(b.status);
      if (bySeverity !== 0) return bySeverity;
      const byAge = attentionAge(b, now) - attentionAge(a, now);
      if (byAge !== 0) return byAge;
      return a.cameraId < b.cameraId ? -1 : a.cameraId > b.cameraId ? 1 : 0;
    });
}

export interface AttentionSummary {
  total: number;
  byBand: Record<AttentionBand, number>;
  /** Entrada mais antiga em atenção contínua, se houver. */
  oldest: AttentionEntry | null;
  /** Idade da entrada mais antiga, em ms. */
  oldestAgeMs: number;
}

export function summarizeAttention(
  ledger: AttentionLedger,
  now: number,
  config: AttentionBandConfig = DEFAULT_BAND_CONFIG
): AttentionSummary {
  const entries = Object.values(ledger);
  const byBand: Record<AttentionBand, number> = { fresh: 0, sustained: 0, prolonged: 0 };
  let oldest: AttentionEntry | null = null;
  let oldestAgeMs = 0;

  for (const entry of entries) {
    byBand[bandOf(entry, now, config)] += 1;
    const age = attentionAge(entry, now);
    if (!oldest || age > oldestAgeMs || (age === oldestAgeMs && entry.cameraId < oldest.cameraId)) {
      oldest = entry;
      oldestAgeMs = age;
    }
  }

  return { total: entries.length, byBand, oldest, oldestAgeMs };
}

/** Rótulo curto e honesto de duração (pt-BR), sem depender de Intl. */
export function formatAge(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : 0;
  const seconds = Math.floor(safe / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours === 0 ? `${days}d` : `${days}d${restHours}h`;
}
