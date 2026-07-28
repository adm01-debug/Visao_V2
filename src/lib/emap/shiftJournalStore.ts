/**
 * Onda 170 — durabilidade da passagem de turno (o F5 não pode apagar história).
 *
 * As Ondas 168/169 vivem em memória: o relógio de atenção e o diário do turno
 * morrem em qualquer recarga da página, queda de aba ou navegação. O efeito
 * colateral é pior do que perder dados — é **mentir**: depois de um F5 uma
 * câmera fora do ar desde as 14h reaparece como "surgida agora", o turno
 * recomeça do zero e a passagem informa 0 fechamentos onde houve 12.
 *
 * Este módulo é a camada de persistência. Ele é **puro**: não conhece
 * `localStorage`, não chama `Date.now()`, não toca no DOM. Recebe texto e
 * devolve estado; recebe estado e devolve texto. O adaptador de armazenamento
 * fica na borda (`readShiftState` / `writeShiftState`), com falha silenciosa
 * porque armazenamento indisponível (modo privado, cota cheia) nunca pode
 * derrubar o mapa.
 *
 * Regras (cada uma existe porque a alternativa corrompe a passagem):
 *
 *  1. **Dado ilegível nunca vira dado.** JSON quebrado, versão desconhecida ou
 *     envelope sem forma esperada descarta TUDO. Aproveitar "a parte que deu
 *     para ler" de um envelope inválido é como assinar um laudo pela metade.
 *  2. **Saneamento por registro dentro de envelope válido.** Uma entrada de
 *     câmera corrompida é descartada sozinha; ela não pode levar junto as
 *     outras 59 câmeras íntegras.
 *  3. **Relógio para trás é suspeito, não é viagem no tempo.** Se o estado foi
 *     salvo "no futuro" (`savedAt > now`, além de uma folga de tolerância), o
 *     estado é descartado: idade negativa fabricaria antiguidade falsa.
 *  4. **Turno expira, pendência não.** Passado `maxShiftMs`, um turno novo é
 *     aberto (contadores zerados, história antiga entregue como `carried`),
 *     mas o relógio de atenção é **preservado**: quem estava fora do ar
 *     continua fora do ar e passa a constar como herança (Onda 169, regra 2).
 *  5. **Idade nunca é reconstruída.** `openedAt`/`since`/`lastSeen` são
 *     instantes absolutos e voltam exatamente como foram salvos. Nada é
 *     "reajustado" para o momento da carga.
 *  6. **A carga sempre informa o que aconteceu.** O resultado carrega um
 *     `outcome` explícito para a UI poder dizer "diário restaurado" ou
 *     "registro anterior ilegível, turno reiniciado" — silêncio aqui é o que
 *     transforma perda de dado em surpresa no meio da madrugada.
 */

import type { AttentionEntry, AttentionLedger } from './attentionClock';
import type { MapMarkerStatus } from './floorPlanGeometry';
import {
  openShift,
  type ShiftClosure,
  type ShiftClosureReason,
  type ShiftJournal,
  type ShiftTotals,
} from './shiftHandoff';

/** Versão do formato serializado. Mudou o formato, muda aqui: dado antigo é descartado (regra 1). */
export const SHIFT_STATE_SCHEMA_VERSION = 1;

/** Chave padrão de armazenamento. */
export const SHIFT_STATE_STORAGE_KEY = 'visao.emap.shift-state.v1';

export interface ShiftState {
  journal: ShiftJournal;
  ledger: AttentionLedger;
}

export interface ShiftStoreConfig {
  /** Duração máxima de um turno antes de rolar para um novo (padrão: 12h). */
  maxShiftMs: number;
  /**
   * Tolerância para relógio adiantado do navegador antes de considerar o
   * registro suspeito (padrão: 5 min). Ajuste fino de NTP não pode apagar
   * o diário de um turno inteiro.
   */
  clockSkewToleranceMs: number;
  /** Teto de entradas de atenção restauradas (defesa contra arquivo inflado). */
  maxLedgerEntries: number;
  /** Teto de fechamentos restaurados. */
  maxClosures: number;
}

export const DEFAULT_SHIFT_STORE_CONFIG: ShiftStoreConfig = {
  maxShiftMs: 12 * 60 * 60 * 1000,
  clockSkewToleranceMs: 5 * 60 * 1000,
  maxLedgerEntries: 500,
  maxClosures: 120,
};

/** O que aconteceu ao tentar restaurar. */
export type ShiftLoadOutcome =
  /** Não havia nada salvo — primeiro uso. */
  | 'empty'
  /** Restaurado integralmente. */
  | 'restored'
  /** Envelope ilegível/incompatível: tudo descartado, turno novo (regra 1). */
  | 'corrupt'
  /** Registro salvo no futuro: descartado por segurança (regra 3). */
  | 'clock_suspect'
  /** Turno anterior expirou: novo turno aberto, atenção preservada (regra 4). */
  | 'rolled_over';

export interface ShiftLoadResult {
  state: ShiftState;
  outcome: ShiftLoadOutcome;
  /** Fechamentos do turno anterior quando houve rolagem — nunca descartados em silêncio. */
  carried: readonly ShiftClosure[];
  /** Quantos registros individuais foram rejeitados por saneamento (regra 2). */
  discardedEntries: number;
}

interface Envelope {
  v: number;
  savedAt: number;
  journal: unknown;
  ledger: unknown;
}

const STATUSES: readonly MapMarkerStatus[] = ['alert', 'offline', 'warning', 'online', 'unknown'];
const REASONS: readonly ShiftClosureReason[] = ['normalized', 'acknowledged', 'removed'];

const isClock = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const isStatus = (value: unknown): value is MapMarkerStatus =>
  typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
const isReason = (value: unknown): value is ShiftClosureReason =>
  typeof value === 'string' && (REASONS as readonly string[]).includes(value);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const emptyState = (startedAt: number): ShiftState => ({
  journal: openShift(startedAt),
  ledger: {},
});

/** Serializa o estado do turno. Puro: o `savedAt` vem de fora. */
export function serializeShiftState(state: ShiftState, savedAt: number): string {
  const envelope: Envelope = {
    v: SHIFT_STATE_SCHEMA_VERSION,
    savedAt: isClock(savedAt) ? savedAt : 0,
    journal: state.journal,
    ledger: state.ledger,
  };
  return JSON.stringify(envelope);
}

function sanitizeEntry(raw: unknown, cameraId: string): AttentionEntry | null {
  if (!isRecord(raw)) return null;
  if (!isId(raw.cameraId) || raw.cameraId !== cameraId) return null;
  if (!isStatus(raw.status) || !isStatus(raw.worst)) return null;
  if (!isClock(raw.since) || !isClock(raw.openedAt) || !isClock(raw.lastSeen)) return null;
  if (!isCount(raw.changes)) return null;
  // Uma janela contínua não pode começar depois do estado atual dela.
  if (raw.openedAt > raw.since) return null;
  return {
    cameraId,
    status: raw.status,
    worst: raw.worst,
    since: raw.since,
    openedAt: raw.openedAt,
    lastSeen: raw.lastSeen,
    changes: Math.floor(raw.changes),
  };
}

function sanitizeClosure(raw: unknown): ShiftClosure | null {
  if (!isRecord(raw)) return null;
  if (!isId(raw.cameraId)) return null;
  if (!isStatus(raw.status) || !isStatus(raw.worst)) return null;
  if (!isClock(raw.openedAt) || !isClock(raw.closedAt)) return null;
  if (raw.closedAt < raw.openedAt) return null;
  if (!isCount(raw.changes)) return null;
  if (!isReason(raw.reason)) return null;
  return {
    cameraId: raw.cameraId,
    status: raw.status,
    worst: raw.worst,
    openedAt: raw.openedAt,
    closedAt: raw.closedAt,
    changes: Math.floor(raw.changes),
    reason: raw.reason,
  };
}

function sanitizeTotals(raw: unknown): ShiftTotals | null {
  if (!isRecord(raw)) return null;
  const totals: ShiftTotals = { normalized: 0, acknowledged: 0, removed: 0 };
  for (const reason of REASONS) {
    const value = raw[reason];
    if (!isCount(value)) return null;
    totals[reason] = Math.floor(value);
  }
  return totals;
}

/**
 * Restaura o estado do turno a partir do texto salvo.
 *
 * Nunca lança: qualquer anomalia vira um turno novo e um `outcome` explícito.
 */
export function parseShiftState(
  raw: string | null | undefined,
  now: number,
  config: ShiftStoreConfig = DEFAULT_SHIFT_STORE_CONFIG,
): ShiftLoadResult {
  const clock = isClock(now) ? now : 0;
  const fresh = (outcome: ShiftLoadOutcome): ShiftLoadResult => ({
    state: emptyState(clock),
    outcome,
    carried: [],
    discardedEntries: 0,
  });

  if (typeof raw !== 'string' || raw.trim().length === 0) return fresh('empty');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fresh('corrupt');
  }

  // Regra 1: envelope inválido descarta tudo, sem aproveitar migalhas.
  if (!isRecord(parsed)) return fresh('corrupt');
  if (parsed.v !== SHIFT_STATE_SCHEMA_VERSION) return fresh('corrupt');
  if (!isClock(parsed.savedAt)) return fresh('corrupt');
  if (!isRecord(parsed.journal) || !isRecord(parsed.ledger)) return fresh('corrupt');

  const journalRaw = parsed.journal;
  if (!isClock(journalRaw.startedAt)) return fresh('corrupt');
  if (!Array.isArray(journalRaw.closures)) return fresh('corrupt');
  const totals = sanitizeTotals(journalRaw.totals);
  if (!totals) return fresh('corrupt');
  if (!isCount(journalRaw.dropped)) return fresh('corrupt');

  // Regra 3: registro salvo no futuro não é aproveitado.
  const tolerance = isCount(config.clockSkewToleranceMs) ? config.clockSkewToleranceMs : 0;
  if (parsed.savedAt > clock + tolerance) return fresh('clock_suspect');
  if (journalRaw.startedAt > clock + tolerance) return fresh('clock_suspect');

  let discardedEntries = 0;

  // Regra 2: saneamento registro a registro dentro de envelope válido.
  const maxLedger = Math.max(1, Math.floor(config.maxLedgerEntries));
  const ledger: Record<string, AttentionEntry> = {};
  let ledgerCount = 0;
  for (const cameraId of Object.keys(parsed.ledger)) {
    const entry = sanitizeEntry((parsed.ledger as Record<string, unknown>)[cameraId], cameraId);
    if (!entry) {
      discardedEntries += 1;
      continue;
    }
    if (ledgerCount >= maxLedger) {
      discardedEntries += 1;
      continue;
    }
    ledger[cameraId] = entry;
    ledgerCount += 1;
  }

  const maxClosures = Math.max(1, Math.floor(config.maxClosures));
  const closures: ShiftClosure[] = [];
  for (const item of journalRaw.closures) {
    const closure = sanitizeClosure(item);
    if (!closure) {
      discardedEntries += 1;
      continue;
    }
    closures.push(closure);
  }
  closures.sort((a, b) => {
    if (b.closedAt !== a.closedAt) return b.closedAt - a.closedAt;
    return a.cameraId < b.cameraId ? -1 : a.cameraId > b.cameraId ? 1 : 0;
  });
  const keptClosures = closures.slice(0, maxClosures);
  const droppedByCap = closures.length - keptClosures.length;

  const journal: ShiftJournal = {
    startedAt: journalRaw.startedAt,
    closures: keptClosures,
    totals,
    dropped: Math.floor(journalRaw.dropped) + droppedByCap,
  };

  // Regra 4: turno expira, pendência sobrevive.
  const maxShift = Math.max(1, Math.floor(config.maxShiftMs));
  if (clock - journal.startedAt >= maxShift) {
    return {
      state: { journal: openShift(clock), ledger },
      outcome: 'rolled_over',
      carried: keptClosures,
      discardedEntries,
    };
  }

  return {
    state: { journal, ledger },
    outcome: 'restored',
    carried: [],
    discardedEntries,
  };
}

/** Armazenamento mínimo exigido (compatível com `localStorage`). */
export interface ShiftStateStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Lê o estado da borda. Armazenamento indisponível nunca derruba o mapa:
 * a falha vira "primeiro uso" e o operador segue trabalhando.
 */
export function readShiftState(
  storage: ShiftStateStorage | null | undefined,
  now: number,
  key: string = SHIFT_STATE_STORAGE_KEY,
  config: ShiftStoreConfig = DEFAULT_SHIFT_STORE_CONFIG,
): ShiftLoadResult {
  if (!storage) return parseShiftState(null, now, config);
  let raw: string | null = null;
  try {
    raw = storage.getItem(key);
  } catch {
    return parseShiftState(null, now, config);
  }
  return parseShiftState(raw, now, config);
}

/** Grava o estado. Cota cheia / modo privado: falha silenciosa e vida que segue. */
export function writeShiftState(
  storage: ShiftStateStorage | null | undefined,
  state: ShiftState,
  savedAt: number,
  key: string = SHIFT_STATE_STORAGE_KEY,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, serializeShiftState(state, savedAt));
    return true;
  } catch {
    return false;
  }
}

/** Descarta o estado salvo (uso: encerrar turno manualmente). */
export function clearShiftState(
  storage: ShiftStateStorage | null | undefined,
  key: string = SHIFT_STATE_STORAGE_KEY,
): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* armazenamento indisponível não é erro de operação */
  }
}

/** Acesso seguro ao `localStorage` (SSR / modo privado devolvem `null`). */
export function browserShiftStorage(): ShiftStateStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}
