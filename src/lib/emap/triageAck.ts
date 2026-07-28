/**
 * Onda 172 — reconhecimento durável e revogável da fila de triagem.
 *
 * A Onda 171 declarou a regra 3 ("reconhecer não é resolver"), mas a página
 * ainda tratava o botão "ciente" como um `clearAttention`: apagava a entrada do
 * relógio de atenção. O efeito prático era mentira dupla — a pendência sumia da
 * fila como se tivesse sido resolvida, e a idade acumulada (a dívida real)
 * era zerada. Além disso, o reconhecimento vivia em memória: um F5 e o turno
 * inteiro voltava a "nunca visto".
 *
 * Este módulo separa os dois livros:
 *
 *   - o **relógio de atenção** (168) continua contando o fato objetivo;
 *   - o **livro de ciência** (aqui) registra a decisão humana sobre aquele fato.
 *
 * Regras invioláveis (cada uma existe porque a alternativa engana o operador):
 *
 *  1. **Ciente é sobre um estado, não sobre uma câmera.** O registro congela
 *     `status`/`worst`/`openedAt` do instante do reconhecimento. Nada aqui
 *     afirma que o problema acabou.
 *  2. **Agravamento revoga.** Se a gravidade piorar em relação ao estado
 *     reconhecido, a ciência cai e o item volta ao topo da fila. Nenhum "ok"
 *     dado a um aviso pode silenciar o alarme que veio depois.
 *  3. **Melhora NÃO revoga.** Um `alert` reconhecido que virou `warning`
 *     continua ciente: a decisão humana cobre o cenário pior, e reabrir por
 *     melhora só treinaria o operador a ignorar a fila.
 *  4. **Janela nova é fato novo.** Se a câmera normalizou e voltou a falhar
 *     (`openedAt` posterior ao registrado), a ciência anterior é inválida.
 *  5. **Ciência expira.** Passado `ttlMs` (padrão 4h) a ciência caduca: nenhum
 *     "eu já vi" pode atravessar turnos em silêncio.
 *  6. **Sair do relógio limpa, não revoga.** Câmera que normalizou/foi removida
 *     tem a ciência descartada como `resolved` — isso é higiene, não dívida.
 *  7. **Dado ilegível nunca vira dado.** Envelope inválido descarta tudo;
 *     registro individual corrompido é descartado sozinho (regras espelhadas
 *     da Onda 170).
 *  8. **Puro e imutável.** Sem `Date.now()`, sem DOM, sem rede, sem mutação das
 *     estruturas recebidas. O adaptador de armazenamento fica na borda e falha
 *     em silêncio: cota cheia jamais derruba o mapa.
 */

import type { AttentionEntry, AttentionLedger } from './attentionClock';
import { severityRank, type MapMarkerStatus } from './floorPlanGeometry';

/** Versão do formato serializado. Mudou o formato, muda aqui (regra 7). */
export const ACK_SCHEMA_VERSION = 1;

/** Chave padrão de armazenamento local. */
export const ACK_STORAGE_KEY = 'visao.emap.triage-ack.v1';

/** Decisão humana congelada sobre um estado específico. */
export interface AckRecord {
  cameraId: string;
  /** Quando o operador declarou ciência. */
  at: number;
  /** Estado observado no instante do reconhecimento (regra 1). */
  status: MapMarkerStatus;
  /** Pior estado da janela naquele instante — base da regra 2. */
  worst: MapMarkerStatus;
  /** Início da janela contínua de atenção reconhecida — base da regra 4. */
  openedAt: number;
}

export type AckLedger = Readonly<Record<string, AckRecord>>;

export interface AckConfig {
  /** Validade da ciência antes de caducar (padrão: 4h). */
  ttlMs: number;
  /** Tolerância para relógio adiantado antes de considerar o arquivo suspeito. */
  clockSkewToleranceMs: number;
  /** Teto de registros restaurados (defesa contra arquivo inflado). */
  maxRecords: number;
}

export const DEFAULT_ACK_CONFIG: AckConfig = {
  ttlMs: 4 * 60 * 60 * 1000,
  clockSkewToleranceMs: 5 * 60 * 1000,
  maxRecords: 500,
};

/** Por que uma ciência deixou de valer. */
export type AckRevocationReason =
  /** Gravidade piorou (regra 2). */
  | 'escalated'
  /** Nova janela de atenção (regra 4). */
  | 'reopened'
  /** Caducou por tempo (regra 5). */
  | 'expired'
  /** Saiu do relógio: normalizou ou foi removida (regra 6). */
  | 'resolved';

export interface AckRevocation {
  cameraId: string;
  reason: AckRevocationReason;
  /** Instante da reconciliação que derrubou a ciência. */
  at: number;
  /** Estado que estava reconhecido. */
  from: MapMarkerStatus;
  /** Estado atual, quando ainda existe entrada no relógio. */
  to: MapMarkerStatus | null;
}

export interface AckReconciliation {
  acks: AckLedger;
  revocations: readonly AckRevocation[];
  /** `false` quando nada mudou — permite evitar re-render/gravação inútil. */
  changed: boolean;
}

const EMPTY_ACKS: AckLedger = Object.freeze({});

/** Livro vazio (referência estável). */
export const emptyAckLedger = (): AckLedger => EMPTY_ACKS;

const isClock = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const STATUSES: readonly MapMarkerStatus[] = ['alert', 'offline', 'warning', 'online', 'unknown'];

const isStatus = (value: unknown): value is MapMarkerStatus =>
  typeof value === 'string' && (STATUSES as readonly string[]).includes(value);

/**
 * Registra ciência sobre o estado atual de uma entrada do relógio.
 *
 * Reconhecer duas vezes o mesmo estado é idempotente em conteúdo, mas atualiza
 * o carimbo `at` (renova o prazo da regra 5) — o operador olhou de novo.
 */
export function acknowledge(ledger: AckLedger, entry: AttentionEntry, now: number): AckLedger {
  if (!entry || typeof entry.cameraId !== 'string' || entry.cameraId.length === 0) return ledger;
  if (!isClock(now)) return ledger;
  const record: AckRecord = {
    cameraId: entry.cameraId,
    at: now,
    status: entry.status,
    worst: entry.worst,
    openedAt: entry.openedAt,
  };
  return { ...ledger, [entry.cameraId]: record };
}

/** Remove a ciência explicitamente (o operador desfez a marcação). */
export function unacknowledge(ledger: AckLedger, cameraId: string): AckLedger {
  if (!(cameraId in ledger)) return ledger;
  const next: Record<string, AckRecord> = { ...ledger };
  delete next[cameraId];
  return next;
}

/** Conjunto de ids cientes — formato que `buildTriageQueue` consome. */
export function acknowledgedIds(ledger: AckLedger): ReadonlySet<string> {
  return new Set(Object.keys(ledger));
}

/**
 * Avalia uma única ciência contra o relógio de atenção.
 *
 * Devolve `null` quando a ciência continua válida.
 */
export function evaluateAck(
  record: AckRecord,
  entry: AttentionEntry | undefined,
  now: number,
  config: AckConfig = DEFAULT_ACK_CONFIG,
): AckRevocationReason | null {
  // Regra 6: sem fato, não há o que reconhecer.
  if (!entry) return 'resolved';
  // Regra 4: janela nova invalida ciência antiga.
  if (isClock(entry.openedAt) && entry.openedAt > record.openedAt) return 'reopened';
  // Regra 2: rank menor = mais grave.
  if (severityRank(entry.status) < severityRank(record.status)) return 'escalated';
  if (severityRank(entry.worst) < severityRank(record.worst)) return 'escalated';
  // Regra 5: caducidade por tempo, sempre por último (agravamento é a causa
  // mais informativa quando os dois ocorrem na mesma rodada).
  const ttl = Number.isFinite(config.ttlMs) && config.ttlMs > 0 ? config.ttlMs : DEFAULT_ACK_CONFIG.ttlMs;
  if (isClock(now) && now - record.at >= ttl) return 'expired';
  return null;
}

/**
 * Reconcilia o livro de ciência contra o relógio de atenção.
 *
 * Nunca lança e nunca inventa ciência: só remove o que deixou de valer.
 */
export function reconcileAcks(
  acks: AckLedger,
  ledger: AttentionLedger,
  now: number,
  config: AckConfig = DEFAULT_ACK_CONFIG,
): AckReconciliation {
  const ids = Object.keys(acks);
  if (ids.length === 0) return { acks, revocations: [], changed: false };
  if (!isClock(now)) return { acks, revocations: [], changed: false };

  const kept: Record<string, AckRecord> = {};
  const revocations: AckRevocation[] = [];

  for (const id of ids.sort()) {
    const record = acks[id];
    if (!record) continue;
    const entry = ledger?.[id];
    const reason = evaluateAck(record, entry, now, config);
    if (reason === null) {
      kept[id] = record;
      continue;
    }
    revocations.push({
      cameraId: id,
      reason,
      at: now,
      from: record.status,
      to: entry ? entry.status : null,
    });
  }

  if (revocations.length === 0) return { acks, revocations: [], changed: false };
  return { acks: kept, revocations, changed: true };
}

// ---------------------------------------------------------------------------
// Serialização (regra 7) — pura: texto entra, estado sai.
// ---------------------------------------------------------------------------

export type AckLoadOutcome =
  /** Nada salvo — primeiro uso. */
  | 'empty'
  /** Restaurado (possivelmente com registros individuais descartados). */
  | 'restored'
  /** Envelope ilegível/incompatível: tudo descartado. */
  | 'corrupt'
  /** Arquivo salvo no futuro: descartado por segurança. */
  | 'clock_suspect';

export interface AckLoadResult {
  acks: AckLedger;
  outcome: AckLoadOutcome;
  /** Registros individuais rejeitados por saneamento. */
  discarded: number;
}

export function serializeAckLedger(acks: AckLedger, savedAt: number): string {
  return JSON.stringify({
    v: ACK_SCHEMA_VERSION,
    savedAt: isClock(savedAt) ? savedAt : 0,
    records: Object.values(acks),
  });
}

function sanitizeRecord(raw: unknown): AckRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  const cameraId = candidate.cameraId;
  if (typeof cameraId !== 'string' || cameraId.length === 0) return null;
  if (!isClock(candidate.at) || !isClock(candidate.openedAt)) return null;
  if (!isStatus(candidate.status) || !isStatus(candidate.worst)) return null;
  return {
    cameraId,
    at: candidate.at,
    status: candidate.status,
    worst: candidate.worst,
    openedAt: candidate.openedAt,
  };
}

export function parseAckLedger(
  raw: string | null | undefined,
  now: number,
  config: AckConfig = DEFAULT_ACK_CONFIG,
): AckLoadResult {
  if (raw == null || raw === '') return { acks: EMPTY_ACKS, outcome: 'empty', discarded: 0 };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { acks: EMPTY_ACKS, outcome: 'corrupt', discarded: 0 };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { acks: EMPTY_ACKS, outcome: 'corrupt', discarded: 0 };
  }
  const envelope = parsed as Record<string, unknown>;
  if (envelope.v !== ACK_SCHEMA_VERSION) {
    return { acks: EMPTY_ACKS, outcome: 'corrupt', discarded: 0 };
  }
  if (!isClock(envelope.savedAt) || !Array.isArray(envelope.records)) {
    return { acks: EMPTY_ACKS, outcome: 'corrupt', discarded: 0 };
  }
  const tolerance = Number.isFinite(config.clockSkewToleranceMs)
    ? Math.max(0, config.clockSkewToleranceMs)
    : DEFAULT_ACK_CONFIG.clockSkewToleranceMs;
  if (isClock(now) && envelope.savedAt > now + tolerance) {
    return { acks: EMPTY_ACKS, outcome: 'clock_suspect', discarded: 0 };
  }

  const maxRecords =
    Number.isFinite(config.maxRecords) && config.maxRecords >= 0
      ? Math.floor(config.maxRecords)
      : DEFAULT_ACK_CONFIG.maxRecords;

  const acks: Record<string, AckRecord> = {};
  let discarded = 0;
  let accepted = 0;

  for (const raw of envelope.records) {
    const record = sanitizeRecord(raw);
    if (!record) {
      discarded += 1;
      continue;
    }
    if (accepted >= maxRecords) {
      discarded += 1;
      continue;
    }
    // Registro salvo "no futuro" é suspeito individualmente: descarta só ele.
    if (isClock(now) && record.at > now + tolerance) {
      discarded += 1;
      continue;
    }
    acks[record.cameraId] = record;
    accepted += 1;
  }

  return { acks, outcome: 'restored', discarded };
}

// ---------------------------------------------------------------------------
// Borda: armazenamento do navegador. Falha sempre em silêncio.
// ---------------------------------------------------------------------------

export interface AckStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Adaptador do navegador; `null` quando indisponível (SSR, modo privado). */
export function browserAckStorage(): AckStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readAckState(
  storage: AckStorage | null,
  now: number,
  config: AckConfig = DEFAULT_ACK_CONFIG,
  key: string = ACK_STORAGE_KEY,
): AckLoadResult {
  if (!storage) return { acks: EMPTY_ACKS, outcome: 'empty', discarded: 0 };
  let raw: string | null = null;
  try {
    raw = storage.getItem(key);
  } catch {
    return { acks: EMPTY_ACKS, outcome: 'empty', discarded: 0 };
  }
  return parseAckLedger(raw, now, config);
}

export function writeAckState(
  storage: AckStorage | null,
  acks: AckLedger,
  now: number,
  key: string = ACK_STORAGE_KEY,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, serializeAckLedger(acks, now));
    return true;
  } catch {
    return false;
  }
}
