/**
 * Onda 182 — fila durável de comandos de episódio (entrega sem perda e sem duplicata).
 *
 * A Onda 181 traduz a agregação em comandos (`open`/`close`); a Onda 180 os
 * persiste no servidor. Entre os dois existe a rede — e é lá que uma
 * implementação ingênua estraga a estatística de reincidência:
 *
 *  - `await rpc(...)` direto no evento: se a rede cai, o fato **some**. Um
 *    alarme que ocorreu nunca entra no histórico e a série parece saudável.
 *  - reenvio cego: o mesmo fato entra duas vezes e uma câmera boa vira
 *    "crônica" — manutenção preventiva disparada por defeito inexistente.
 *  - drenagem paralela: um `close` chega antes do `open` da mesma série e o
 *    servidor recusa; o episódio fica aberto para sempre.
 *
 * Este módulo é a regra única dessa entrega. É **puro**: não chama rede, não
 * lê relógio, não conhece `localStorage`. Recebe fila + agora, devolve fila
 * nova. O adaptador de I/O fica no hook.
 *
 * Invariantes (cada uma existe porque a alternativa corrompe o livro):
 *
 *  1. **Identidade pelo fato, não pela tentativa.** A chave é
 *     `kind:seriesKey:at`. Reenfileirar o mesmo fato (retry de UI, reconexão,
 *     recarga com fila persistida) é no-op: idempotência antes da rede,
 *     não depois.
 *  2. **Ordem dentro da série é sagrada.** Comandos da mesma série saem em
 *     ordem de carimbo, um de cada vez. Séries diferentes são independentes e
 *     podem drenar em paralelo.
 *  3. **Espera não é perda.** Falha de transporte agenda nova tentativa com
 *     recuo exponencial e teto; o item continua na fila.
 *  4. **Recusa definitiva não é retentativa.** Se o servidor diz que o fato é
 *     inválido/antigo (`permanent`), insistir só queima orçamento: o item sai
 *     da fila e vai para a carta morta, visível e auditável.
 *  5. **Teto de memória com descarte honesto.** A fila tem limite; ao estourar,
 *     descarta os **mais antigos** (menos úteis para a janela corrente) e
 *     contabiliza o descarte. Fila silenciosamente truncada é pior do que
 *     fila cheia declarada.
 *  6. **Bloqueio de série não bloqueia a fila.** Um item em recuo trava apenas
 *     a própria série (invariante 2), nunca as demais.
 */

import type { EpisodeCommand } from './alarmEpisodeBridge';
import type { RecurrenceSeverity } from './alarmRecurrence';

export type DeliveryFailure = 'retryable' | 'permanent';

export interface QueuedCommand {
  /** Chave de idempotência derivada do fato (invariante 1). */
  readonly id: string;
  readonly command: EpisodeCommand;
  readonly enqueuedAt: number;
  readonly attempts: number;
  /** Instante a partir do qual o item pode ser tentado (invariante 3). */
  readonly nextAttemptAt: number;
  readonly lastError: string | null;
}

export interface DeadCommand {
  readonly id: string;
  readonly command: EpisodeCommand;
  readonly attempts: number;
  readonly reason: DeliveryFailure;
  readonly error: string | null;
  readonly at: number;
}

export interface CommandQueue {
  readonly pending: readonly QueuedCommand[];
  readonly dead: readonly DeadCommand[];
  /** Quantos itens foram descartados por teto de fila (invariante 5). */
  readonly dropped: number;
}

export interface QueueConfig {
  /** Teto de itens pendentes. */
  readonly maxPending: number;
  /** Teto de itens em carta morta. */
  readonly maxDead: number;
  /** Recuo base em ms. */
  readonly baseBackoffMs: number;
  /** Teto de recuo em ms. */
  readonly maxBackoffMs: number;
  /** Tentativas antes de declarar carta morta. */
  readonly maxAttempts: number;
}

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxPending: 500,
  maxDead: 50,
  baseBackoffMs: 1_000,
  maxBackoffMs: 60_000,
  maxAttempts: 8,
};

export const emptyCommandQueue = (): CommandQueue => ({ pending: [], dead: [], dropped: 0 });

const SEVERITIES: readonly RecurrenceSeverity[] = ['low', 'medium', 'high', 'critical'];

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isKey = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Chave de idempotência: o fato, nunca a tentativa (invariante 1). */
export function commandId(command: EpisodeCommand): string {
  return `${command.kind}:${command.seriesKey}:${command.at}`;
}

export function isValidCommand(command: unknown): command is EpisodeCommand {
  if (!command || typeof command !== 'object') return false;
  const c = command as Partial<EpisodeCommand> & { severity?: unknown };
  if (!isKey(c.seriesKey) || !isFiniteNumber(c.at)) return false;
  if (c.kind === 'close') return true;
  if (c.kind === 'open') {
    return typeof c.severity === 'string' && (SEVERITIES as readonly string[]).includes(c.severity);
  }
  return false;
}

export function resolveQueueConfig(cfg?: Partial<QueueConfig> | null): QueueConfig {
  const merged = { ...DEFAULT_QUEUE_CONFIG, ...(cfg ?? {}) };
  const positive = (value: number, fallback: number): number =>
    Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
  const base = positive(merged.baseBackoffMs, DEFAULT_QUEUE_CONFIG.baseBackoffMs);
  return {
    maxPending: positive(merged.maxPending, DEFAULT_QUEUE_CONFIG.maxPending),
    maxDead: positive(merged.maxDead, DEFAULT_QUEUE_CONFIG.maxDead),
    baseBackoffMs: base,
    // O teto nunca pode ficar abaixo da base: recuo decrescente é bug silencioso.
    maxBackoffMs: Math.max(base, positive(merged.maxBackoffMs, DEFAULT_QUEUE_CONFIG.maxBackoffMs)),
    maxAttempts: positive(merged.maxAttempts, DEFAULT_QUEUE_CONFIG.maxAttempts),
  };
}

/** Recuo exponencial determinístico, com teto (invariante 3). */
export function backoffMs(attempts: number, cfg: QueueConfig): number {
  const n = Math.max(1, Math.floor(attempts));
  const exponent = Math.min(n - 1, 30);
  return Math.min(cfg.maxBackoffMs, cfg.baseBackoffMs * 2 ** exponent);
}

const sortPending = (items: QueuedCommand[]): QueuedCommand[] =>
  [...items].sort((a, b) => {
    if (a.command.seriesKey !== b.command.seriesKey) {
      return a.command.seriesKey < b.command.seriesKey ? -1 : 1;
    }
    if (a.command.at !== b.command.at) return a.command.at - b.command.at;
    // Mesmo carimbo: abertura precede fechamento (invariante 2).
    if (a.command.kind !== b.command.kind) return a.command.kind === 'open' ? -1 : 1;
    return a.enqueuedAt - b.enqueuedAt;
  });

/**
 * Enfileira comandos. Repetição do mesmo fato é absorvida (invariante 1) e o
 * estouro de teto descarta os mais antigos, contabilizando (invariante 5).
 */
export function enqueueCommands(
  queue: CommandQueue,
  commands: readonly EpisodeCommand[],
  now: number,
  config?: Partial<QueueConfig> | null,
): CommandQueue {
  const cfg = resolveQueueConfig(config);
  const base = queue && typeof queue === 'object' ? queue : emptyCommandQueue();
  if (!Array.isArray(commands) || commands.length === 0) return base;
  const at = isFiniteNumber(now) ? now : 0;

  const known = new Set(base.pending.map((item) => item.id));
  const next: QueuedCommand[] = [...base.pending];

  for (const command of commands) {
    if (!isValidCommand(command)) continue;
    const id = commandId(command);
    if (known.has(id)) continue;
    known.add(id);
    next.push({ id, command, enqueuedAt: at, attempts: 0, nextAttemptAt: at, lastError: null });
  }

  const ordered = sortPending(next);
  let dropped = base.dropped;
  let trimmed = ordered;
  if (ordered.length > cfg.maxPending) {
    // Descarte pelo mais antigo em ordem de chegada — o passado remoto é o que
    // menos afeta a janela corrente de reincidência.
    const byAge = [...ordered].sort((a, b) => a.enqueuedAt - b.enqueuedAt || (a.id < b.id ? -1 : 1));
    const excess = ordered.length - cfg.maxPending;
    const doomed = new Set(byAge.slice(0, excess).map((item) => item.id));
    trimmed = ordered.filter((item) => !doomed.has(item.id));
    dropped += excess;
  }

  return { pending: trimmed, dead: base.dead, dropped };
}

/**
 * Devolve os comandos elegíveis agora: no máximo um por série, respeitando a
 * ordem e o recuo (invariantes 2, 3 e 6).
 */
export function dueCommands(
  queue: CommandQueue,
  now: number,
  limit = Number.POSITIVE_INFINITY,
): readonly QueuedCommand[] {
  if (!queue || !Array.isArray(queue.pending)) return [];
  const at = isFiniteNumber(now) ? now : 0;
  const seen = new Set<string>();
  const out: QueuedCommand[] = [];
  for (const item of sortPending([...queue.pending])) {
    const series = item.command.seriesKey;
    if (seen.has(series)) continue;
    // Primeiro item da série: se ainda está em recuo, a série inteira espera.
    seen.add(series);
    if (item.nextAttemptAt > at) continue;
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/** Entrega confirmada: o item some sem deixar rastro na fila. */
export function markDelivered(queue: CommandQueue, id: string): CommandQueue {
  if (!queue || !Array.isArray(queue.pending)) return emptyCommandQueue();
  return { ...queue, pending: queue.pending.filter((item) => item.id !== id) };
}

/**
 * Falha de entrega. `retryable` agenda nova tentativa; `permanent` (ou
 * esgotamento de tentativas) manda para a carta morta (invariantes 3 e 4).
 */
export function markFailed(
  queue: CommandQueue,
  id: string,
  failure: DeliveryFailure,
  now: number,
  error: string | null = null,
  config?: Partial<QueueConfig> | null,
): CommandQueue {
  const cfg = resolveQueueConfig(config);
  if (!queue || !Array.isArray(queue.pending)) return emptyCommandQueue();
  const at = isFiniteNumber(now) ? now : 0;
  const target = queue.pending.find((item) => item.id === id);
  if (!target) return queue;

  const attempts = target.attempts + 1;
  const exhausted = failure === 'permanent' || attempts >= cfg.maxAttempts;

  if (exhausted) {
    const dead: DeadCommand = {
      id: target.id,
      command: target.command,
      attempts,
      reason: failure,
      error,
      at,
    };
    const nextDead = [...queue.dead, dead].slice(-cfg.maxDead);
    return {
      pending: queue.pending.filter((item) => item.id !== id),
      dead: nextDead,
      dropped: queue.dropped,
    };
  }

  return {
    ...queue,
    pending: queue.pending.map((item) =>
      item.id === id
        ? { ...item, attempts, nextAttemptAt: at + backoffMs(attempts, cfg), lastError: error }
        : item,
    ),
  };
}

/** Reabilita imediatamente tudo que está em recuo (usar ao voltar a conexão). */
export function resumeAll(queue: CommandQueue, now: number): CommandQueue {
  if (!queue || !Array.isArray(queue.pending)) return emptyCommandQueue();
  const at = isFiniteNumber(now) ? now : 0;
  return {
    ...queue,
    pending: queue.pending.map((item) =>
      item.nextAttemptAt > at ? { ...item, nextAttemptAt: at } : item,
    ),
  };
}

/** Recoloca uma carta morta na fila, com histórico de tentativas zerado. */
export function requeueDead(queue: CommandQueue, id: string, now: number): CommandQueue {
  if (!queue || !Array.isArray(queue.dead)) return emptyCommandQueue();
  const target = queue.dead.find((item) => item.id === id);
  if (!target) return queue;
  const withoutDead: CommandQueue = {
    ...queue,
    dead: queue.dead.filter((item) => item.id !== id),
  };
  return enqueueCommands(withoutDead, [target.command], now);
}

export interface QueueStats {
  readonly pending: number;
  readonly ready: number;
  readonly waiting: number;
  readonly dead: number;
  readonly dropped: number;
  readonly oldestPendingAt: number | null;
}

export function queueStats(queue: CommandQueue, now: number): QueueStats {
  const pending = Array.isArray(queue?.pending) ? queue.pending : [];
  const at = isFiniteNumber(now) ? now : 0;
  const ready = pending.filter((item) => item.nextAttemptAt <= at).length;
  return {
    pending: pending.length,
    ready,
    waiting: pending.length - ready,
    dead: Array.isArray(queue?.dead) ? queue.dead.length : 0,
    dropped: isFiniteNumber(queue?.dropped) ? queue.dropped : 0,
    oldestPendingAt: pending.length
      ? pending.reduce((min, item) => Math.min(min, item.enqueuedAt), Number.POSITIVE_INFINITY)
      : null,
  };
}

/** Rótulo humano do estado da fila, em português, para a UI. */
export function queueStatusText(stats: QueueStats): string {
  if (stats.pending === 0 && stats.dead === 0) return 'Histórico de alarmes sincronizado';
  const parts: string[] = [];
  if (stats.ready > 0) parts.push(`${stats.ready} a enviar`);
  if (stats.waiting > 0) parts.push(`${stats.waiting} aguardando nova tentativa`);
  if (stats.dead > 0) parts.push(`${stats.dead} recusado(s) pelo servidor`);
  if (stats.dropped > 0) parts.push(`${stats.dropped} descartado(s) por limite de fila`);
  return parts.join(' · ');
}

// ---------------------------------------------------------------------------
// Persistência (a fila precisa sobreviver ao F5, senão o offline não serve)
// ---------------------------------------------------------------------------

export const QUEUE_SCHEMA_VERSION = 1;
export const QUEUE_STORAGE_KEY = 'visao.alarms.episode-queue.v1';

interface QueueEnvelope {
  version: number;
  savedAt: number;
  queue: CommandQueue;
}

export function serializeQueue(queue: CommandQueue, savedAt: number): string {
  const envelope: QueueEnvelope = {
    version: QUEUE_SCHEMA_VERSION,
    savedAt: isFiniteNumber(savedAt) ? savedAt : 0,
    queue,
  };
  return JSON.stringify(envelope);
}

/**
 * Lê a fila persistida. Envelope ilegível descarta tudo; registro corrompido
 * é descartado sozinho, sem levar os íntegros junto.
 */
export function parseQueue(raw: string | null | undefined): CommandQueue {
  if (typeof raw !== 'string' || raw.trim().length === 0) return emptyCommandQueue();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyCommandQueue();
  }
  if (!parsed || typeof parsed !== 'object') return emptyCommandQueue();
  const envelope = parsed as Partial<QueueEnvelope>;
  if (envelope.version !== QUEUE_SCHEMA_VERSION) return emptyCommandQueue();
  const queue = envelope.queue;
  if (!queue || typeof queue !== 'object') return emptyCommandQueue();

  const seen = new Set<string>();
  const pending: QueuedCommand[] = [];
  for (const item of Array.isArray(queue.pending) ? queue.pending : []) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<QueuedCommand>;
    if (!isValidCommand(candidate.command)) continue;
    const id = commandId(candidate.command);
    if (seen.has(id)) continue;
    seen.add(id);
    pending.push({
      id,
      command: candidate.command,
      enqueuedAt: isFiniteNumber(candidate.enqueuedAt) ? candidate.enqueuedAt : 0,
      attempts: isFiniteNumber(candidate.attempts) ? Math.max(0, Math.floor(candidate.attempts)) : 0,
      nextAttemptAt: isFiniteNumber(candidate.nextAttemptAt) ? candidate.nextAttemptAt : 0,
      lastError: typeof candidate.lastError === 'string' ? candidate.lastError : null,
    });
  }

  const dead: DeadCommand[] = [];
  for (const item of Array.isArray(queue.dead) ? queue.dead : []) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<DeadCommand>;
    if (!isValidCommand(candidate.command)) continue;
    dead.push({
      id: commandId(candidate.command),
      command: candidate.command,
      attempts: isFiniteNumber(candidate.attempts) ? Math.max(0, Math.floor(candidate.attempts)) : 0,
      reason: candidate.reason === 'permanent' ? 'permanent' : 'retryable',
      error: typeof candidate.error === 'string' ? candidate.error : null,
      at: isFiniteNumber(candidate.at) ? candidate.at : 0,
    });
  }

  return {
    pending: sortPending(pending),
    dead,
    dropped: isFiniteNumber(queue.dropped) ? Math.max(0, Math.floor(queue.dropped)) : 0,
  };
}
