/**
 * Onda 231 — Leitura desconfiada do histórico de expurgo do livro de admissão.
 *
 * A trilha `public.admission_ledger_purge_runs` é append-only e imutável, mas
 * isso NÃO significa que cada linha seja legível ou coerente: colunas podem
 * chegar como texto (bigint via PostgREST), nulas, negativas ou com o espelho
 * `capped = (deferred_count > 0)` violado por uma migração futura mal feita.
 *
 * Esta régua é PURA: não conhece banco, nem relógio global, nem React.
 *
 * Leis (H1–H8):
 *  H1. Linha ilegível nunca vira execução válida — é contada à parte.
 *  H2. Ausência de execução legível NUNCA é "em dia": é `never_ran`.
 *  H3. Pontualidade sai da cadência declarada: atraso a partir de 2× e parada
 *      a partir de 4× (mesma escada do cadastro de retenção, Onda 134).
 *  H4. Espelho `capped ⇔ deferred > 0` violado contesta a linha (`inconsistent`)
 *      — contestada nunca é saudável, mas também nunca é ilegível.
 *  H5. Passivo (`deferred`) é EIXO SEPARADO da pontualidade: rotina pontual com
 *      passivo é `backlog`, nunca `ok`.
 *  H6. Passivo crescente entre execuções consecutivas legíveis agrava para
 *      `backlog_growing` — o teto de lote está perdendo a corrida.
 *  H7. Ordem estável e determinística: `executed_at` desc, desempate por `id`.
 *  H8. Quarentena nunca desaparece do retrato, mesmo quando zero.
 */

/** Cadência declarada da rotina (cron `47 3 * * *` = diária). */
export const PURGE_CADENCE_MINUTES = 24 * 60;

/** Multiplicadores da escada de pontualidade (espelham a Onda 134). */
export const LATE_FACTOR = 2;
export const STALLED_FACTOR = 4;

/** Quantas execuções o retrato considera para tendência de passivo. */
export const TREND_WINDOW = 3;

export type PurgeRowStatus = 'valid' | 'inconsistent' | 'unreadable';

export type PurgeHealth =
  'ok' | 'backlog' | 'backlog_growing' | 'late' | 'stalled' | 'contested' | 'never_ran' | 'unknown';

/** Linha crua vinda do banco — deliberadamente `unknown` em tudo. */
export interface RawPurgeRunRow {
  readonly id?: unknown;
  readonly executed_at?: unknown;
  readonly cutoff_at?: unknown;
  readonly retention_days?: unknown;
  readonly batch_cap?: unknown;
  readonly deleted_count?: unknown;
  readonly deferred_count?: unknown;
  readonly quarantined_count?: unknown;
  readonly capped?: unknown;
  readonly duration_ms?: unknown;
}

export interface PurgeRunReading {
  readonly id: string;
  readonly status: PurgeRowStatus;
  /** Motivo curto e auditável quando a linha não é `valid`. */
  readonly reason: string | null;
  readonly executedAt: number | null;
  readonly cutoffAt: number | null;
  readonly retentionDays: number | null;
  readonly batchCap: number | null;
  readonly deleted: number | null;
  readonly deferred: number | null;
  readonly quarantined: number | null;
  readonly capped: boolean | null;
  readonly durationMs: number | null;
}

export interface PurgeHistorySnapshot {
  readonly health: PurgeHealth;
  /** Rótulo curto em PT-BR para a UI. */
  readonly label: string;
  readonly rows: readonly PurgeRunReading[];
  readonly lastValid: PurgeRunReading | null;
  readonly hoursSinceLast: number | null;
  readonly totalRows: number;
  readonly validRows: number;
  readonly inconsistentRows: number;
  readonly unreadableRows: number;
  /** Passivo da execução válida mais recente (H5). */
  readonly deferredNow: number;
  /** Quarentena da execução válida mais recente (H8). */
  readonly quarantinedNow: number;
  /** Passivo crescente nas últimas `TREND_WINDOW` execuções válidas (H6). */
  readonly backlogGrowing: boolean;
  readonly deletedWindow: number;
}

const HEALTH_LABEL: Record<PurgeHealth, string> = {
  ok: 'em dia',
  backlog: 'com passivo',
  backlog_growing: 'passivo crescente',
  late: 'atrasada',
  stalled: 'parada',
  contested: 'contestada',
  never_ran: 'nunca executou',
  unknown: 'indeterminada',
};

export function purgeHealthLabel(health: PurgeHealth): string {
  return HEALTH_LABEL[health];
}

/** Lê um instante em ms; `null` se ilegível (nunca lança). */
export function readInstantStrict(value: unknown): number | null {
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

/**
 * Lê um contador não-negativo. `bigint` do Postgres chega como string via
 * PostgREST, então texto numérico é aceito — texto qualquer, não.
 */
export function readCount(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value === 'bigint') {
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 0 ? n : null;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const n = Number(value.trim());
    return Number.isSafeInteger(n) ? n : null;
  }
  return null;
}

function readBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function readId(value: unknown, index: number): string {
  return typeof value === 'string' && value.trim() !== '' ? value : `linha-${index}`;
}

/** H1/H4 — lê uma linha crua sem jamais confiar nela. */
export function readPurgeRun(raw: RawPurgeRunRow, index = 0): PurgeRunReading {
  const id = readId(raw.id, index);
  const executedAt = readInstantStrict(raw.executed_at);
  const cutoffAt = readInstantStrict(raw.cutoff_at);
  const retentionDays = readCount(raw.retention_days);
  const batchCap = readCount(raw.batch_cap);
  const deleted = readCount(raw.deleted_count);
  const deferred = readCount(raw.deferred_count);
  const quarantined = readCount(raw.quarantined_count);
  const capped = readBool(raw.capped);
  const durationMs = readCount(raw.duration_ms);

  const base = {
    id,
    executedAt,
    cutoffAt,
    retentionDays,
    batchCap,
    deleted,
    deferred,
    quarantined,
    capped,
    durationMs,
  } as const;

  if (executedAt === null) {
    return { ...base, status: 'unreadable', reason: 'execucao_sem_relogio' };
  }
  if (deleted === null || deferred === null || quarantined === null) {
    return { ...base, status: 'unreadable', reason: 'contador_ilegivel' };
  }
  if (batchCap === null || batchCap < 1) {
    return { ...base, status: 'unreadable', reason: 'teto_ilegivel' };
  }
  if (retentionDays === null || retentionDays < 1) {
    return { ...base, status: 'unreadable', reason: 'prazo_ilegivel' };
  }
  if (capped === null) {
    return { ...base, status: 'unreadable', reason: 'marca_de_teto_ilegivel' };
  }
  // H4 — o espelho do banco tem de valer também na leitura.
  if (capped !== deferred > 0) {
    return { ...base, status: 'inconsistent', reason: 'espelho_de_teto_divergente' };
  }
  if (deleted > batchCap) {
    return { ...base, status: 'inconsistent', reason: 'apagados_acima_do_teto' };
  }
  if (cutoffAt !== null && cutoffAt > executedAt) {
    return { ...base, status: 'inconsistent', reason: 'corte_no_futuro' };
  }
  return { ...base, status: 'valid', reason: null };
}

function compareRows(a: PurgeRunReading, b: PurgeRunReading): number {
  const at = a.executedAt;
  const bt = b.executedAt;
  // H7 — ilegíveis sem relógio ficam no fim, mas com ordem estável por id.
  if (at === null && bt === null) return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  if (at === null) return 1;
  if (bt === null) return -1;
  if (at !== bt) return bt - at;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export interface PurgeHistoryOptions {
  readonly now: number;
  readonly cadenceMinutes?: number;
}

/**
 * H2/H3/H5/H6/H8 — monta o retrato do histórico.
 * Nunca lança: entrada inválida vira `unknown`, jamais `ok`.
 */
export function readPurgeHistory(
  raws: readonly RawPurgeRunRow[] | null | undefined,
  options: PurgeHistoryOptions
): PurgeHistorySnapshot {
  const list = Array.isArray(raws) ? raws : [];
  const rows = list.map((raw, i) => readPurgeRun(raw ?? {}, i)).sort(compareRows);

  const valid = rows.filter((r) => r.status === 'valid');
  const inconsistentRows = rows.filter((r) => r.status === 'inconsistent').length;
  const unreadableRows = rows.filter((r) => r.status === 'unreadable').length;
  const lastValid = valid[0] ?? null;

  const now = readInstantStrict(options.now);
  const cadence =
    typeof options.cadenceMinutes === 'number' &&
    Number.isFinite(options.cadenceMinutes) &&
    options.cadenceMinutes > 0
      ? options.cadenceMinutes
      : PURGE_CADENCE_MINUTES;

  const deferredNow = lastValid?.deferred ?? 0;
  const quarantinedNow = lastValid?.quarantined ?? 0;
  const deletedWindow = valid.reduce((sum, r) => sum + (r.deleted ?? 0), 0);

  // H6 — tendência do passivo nas execuções mais recentes (do mais antigo p/ o novo).
  const trend = valid
    .slice(0, TREND_WINDOW)
    .map((r) => r.deferred ?? 0)
    .reverse();
  let backlogGrowing = false;
  for (let i = 1; i < trend.length; i += 1) {
    const prev = trend[i - 1] ?? 0;
    const curr = trend[i] ?? 0;
    if (curr > prev) backlogGrowing = true;
    else if (curr < prev) backlogGrowing = false;
  }
  if (trend.length < 2) backlogGrowing = false;

  const shell = {
    rows,
    lastValid,
    totalRows: rows.length,
    validRows: valid.length,
    inconsistentRows,
    unreadableRows,
    deferredNow,
    quarantinedNow,
    backlogGrowing,
    deletedWindow,
  } as const;

  const finish = (health: PurgeHealth, hoursSinceLast: number | null): PurgeHistorySnapshot => ({
    ...shell,
    health,
    label: HEALTH_LABEL[health],
    hoursSinceLast,
  });

  // Relógio ilegível não autoriza veredito de pontualidade (H2).
  if (now === null) return finish('unknown', null);

  if (lastValid === null || lastValid.executedAt === null) {
    // H1 — só ilegível/contestado no histórico não é "nunca executou" limpo.
    if (rows.length > 0) return finish('contested', null);
    return finish('never_ran', null);
  }

  const elapsedMin = (now - lastValid.executedAt) / 60_000;
  const hoursSinceLast = elapsedMin / 60;

  if (elapsedMin < 0) return finish('unknown', hoursSinceLast);
  if (elapsedMin > cadence * STALLED_FACTOR) return finish('stalled', hoursSinceLast);
  if (elapsedMin > cadence * LATE_FACTOR) return finish('late', hoursSinceLast);

  // Pontual, mas o eixo do passivo é independente (H5/H6).
  if (deferredNow > 0) {
    return finish(backlogGrowing ? 'backlog_growing' : 'backlog', hoursSinceLast);
  }
  // Linha contestada na trilha rebaixa o retrato mesmo com rotina pontual (H4).
  if (inconsistentRows > 0 || unreadableRows > 0) return finish('contested', hoursSinceLast);

  return finish('ok', hoursSinceLast);
}

/** Severidade para ordenação/estilo: maior = pior. */
export function purgeHealthSeverity(health: PurgeHealth): number {
  switch (health) {
    case 'ok':
      return 0;
    case 'backlog':
      return 1;
    case 'backlog_growing':
      return 2;
    case 'late':
      return 3;
    case 'contested':
      return 4;
    case 'unknown':
      return 5;
    case 'never_ran':
      return 6;
    case 'stalled':
      return 7;
    default:
      return 5;
  }
}
