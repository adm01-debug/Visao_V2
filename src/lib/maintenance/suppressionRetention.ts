/**
 * Onda 243 — Guarda de retenção da trilha de supressão (Onda 242).
 *
 * `maintenance_dispatch_suppressions` ganha uma linha por par
 * (condição, canal) silenciado. Numa frota com dezenas de condições crônicas e
 * despacho de 15 em 15 minutos, isso é crescimento linear e perpétuo de uma
 * tabela cuja leitura (`maintenance_suppression_ledger`) já nasce com teto de
 * 2000 linhas. Sem guarda, o teto satura permanentemente e a leitura passa a
 * descrever apenas o passado recente — sem nunca dizer que está cega.
 *
 * Apagar aqui é mais delicado do que parece. A régua da Onda 242 conclui
 * `starved` (crítico) quando uma condição foi **calada sem nenhuma entrega**.
 * Esse veredito é feito de linhas presentes: apagar as supressões de uma
 * condição faminta converte o crítico em `no_history`, que é silêncio. O
 * expurgo, portanto, jamais pode zerar a série de uma condição viva.
 *
 * Leis (T1–T9):
 *  T1. Corte declarado: o expurgo ancora num instante recebido (`now`). Sem
 *      relógio legível, nada é apagado (`bad_now`).
 *  T2. Prazo na faixa 30–730 dias. Abaixo de 30 dias o expurgo comeria a
 *      janela de leitura (7 dias) mais qualquer folga de investigação; fora da
 *      faixa **recusa** o expurgo inteiro em vez de "corrigir" o parâmetro.
 *  T3. O prazo conta por `suppressedAt` (o instante do silêncio), nunca por
 *      `createdAt`. Empate no corte exato **preserva** (`suppressedAt >=
 *      cutoff` fica).
 *  T4. Âncora **por condição**: as `anchorPerCondition` linhas legíveis mais
 *      recentes de cada condição são intocáveis, mesmo vencidas. É o que
 *      impede que `starved` vire `no_history` num cron atrasado.
 *  T5. Linha ilegível (condição vazia, canal fora do catálogo, janela ≤ 0,
 *      instante inválido) vai para quarentena, nunca para o lixo: apagar o que
 *      não se entende destrói a prova de um defeito de gravação.
 *  T6. Teto de lote obrigatório (1..100.000). Excedente vira expurgo parcial e
 *      **declarado** (`capped: true`), sempre removendo as mais antigas.
 *  T7. Contabilidade fechada:
 *      `deleted + kept + anchored + quarantined + deferred === examined`.
 *  T8. Determinismo: a ordem das linhas de entrada nunca altera o resultado.
 *  T9. Linha no futuro nunca é apagada — é ilegível (T5). Relógio adiantado de
 *      um emissor não pode ser desculpa para remover prova.
 */

/** Faixa aceita para o prazo de guarda, em dias (T2). */
export const SUPPRESSION_RETENTION_DAYS_MIN = 30;
export const SUPPRESSION_RETENTION_DAYS_MAX = 730;
/** Padrão: 90 dias — um trimestre de auditoria de ruído. */
export const SUPPRESSION_RETENTION_DAYS_DEFAULT = 90;

/** Faixa aceita para o teto de lote (T6). */
export const SUPPRESSION_BATCH_CAP_MIN = 1;
export const SUPPRESSION_BATCH_CAP_MAX = 100_000;
export const SUPPRESSION_BATCH_CAP_DEFAULT = 20_000;

/** Faixa e padrão da âncora por condição (T4). */
export const SUPPRESSION_ANCHOR_MIN = 1;
export const SUPPRESSION_ANCHOR_MAX = 1_000;
export const SUPPRESSION_ANCHOR_DEFAULT = 3;

/** Canais aceitos — espelha o CHECK da tabela (T5). */
export const RETENTION_CHANNELS = ['telegram', 'email'] as const;
export type RetentionChannel = (typeof RETENTION_CHANNELS)[number];

const MS_PER_DAY = 86_400_000;
/** Teto do CHECK `window_minutes <= 43200` (30 dias). */
const MAX_WINDOW_MINUTES = 43_200;

/** Linha candidata, no formato mínimo lido do banco. */
export interface SuppressionCandidate {
  /** `bigint` chega como string pela Data API; aceitamos ambos. */
  readonly id: string | number;
  readonly suppressedAt?: unknown;
  readonly conditionKey?: unknown;
  readonly channel?: unknown;
  readonly windowMinutes?: unknown;
}

export type SuppressionOutcome = 'delete' | 'keep' | 'anchor' | 'quarantine' | 'defer';

export interface SuppressionDecision {
  readonly id: string;
  readonly outcome: SuppressionOutcome;
  /** Motivo legível — usado no gate e na simulação. */
  readonly reason: string;
}

export type SuppressionRefusal =
  'bad_now' | 'bad_retention_days' | 'bad_batch_cap' | 'bad_anchor_keep';

export interface SuppressionPurgePlan {
  readonly ok: boolean;
  readonly refusal?: SuppressionRefusal;
  readonly cutoffAt: number;
  readonly retentionDays: number;
  readonly batchCap: number;
  readonly anchorPerCondition: number;
  readonly examined: number;
  readonly deleted: number;
  readonly kept: number;
  readonly anchored: number;
  readonly quarantined: number;
  readonly deferred: number;
  readonly capped: boolean;
  /** Ids na ordem exata de remoção (mais antigas primeiro). */
  readonly deleteIds: readonly string[];
  readonly decisions: readonly SuppressionDecision[];
}

export interface SuppressionPurgeOptions {
  readonly now: number;
  readonly retentionDays?: number;
  readonly batchCap?: number;
  readonly anchorPerCondition?: number;
}

function refusal(kind: SuppressionRefusal): SuppressionPurgePlan {
  return {
    ok: false,
    refusal: kind,
    cutoffAt: Number.NaN,
    retentionDays: 0,
    batchCap: 0,
    anchorPerCondition: 0,
    examined: 0,
    deleted: 0,
    kept: 0,
    anchored: 0,
    quarantined: 0,
    deferred: 0,
    capped: false,
    deleteIds: [],
    decisions: [],
  };
}

function parseInstant(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function parseCondition(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isChannel(value: unknown): value is RetentionChannel {
  return typeof value === 'string' && (RETENTION_CHANNELS as readonly string[]).includes(value);
}

function isWindow(value: unknown): boolean {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= MAX_WINDOW_MINUTES
  );
}

interface Parsed {
  readonly id: string;
  readonly at: number;
  readonly conditionKey: string;
}

/**
 * Planeja o expurgo da trilha de supressão.
 *
 * Devolve um plano completo (nunca executa nada) para que a mesma régua possa
 * ser confrontada com a rotina SQL no gate de CI.
 */
export function planSuppressionPurge(
  candidates: readonly SuppressionCandidate[],
  options: SuppressionPurgeOptions
): SuppressionPurgePlan {
  const { now } = options;
  if (!Number.isFinite(now)) return refusal('bad_now'); // T1

  const retentionDays = options.retentionDays ?? SUPPRESSION_RETENTION_DAYS_DEFAULT;
  if (
    !Number.isFinite(retentionDays) ||
    !Number.isInteger(retentionDays) ||
    retentionDays < SUPPRESSION_RETENTION_DAYS_MIN ||
    retentionDays > SUPPRESSION_RETENTION_DAYS_MAX
  ) {
    return refusal('bad_retention_days'); // T2
  }

  const batchCap = options.batchCap ?? SUPPRESSION_BATCH_CAP_DEFAULT;
  if (
    !Number.isFinite(batchCap) ||
    !Number.isInteger(batchCap) ||
    batchCap < SUPPRESSION_BATCH_CAP_MIN ||
    batchCap > SUPPRESSION_BATCH_CAP_MAX
  ) {
    return refusal('bad_batch_cap'); // T6
  }

  const anchor = options.anchorPerCondition ?? SUPPRESSION_ANCHOR_DEFAULT;
  if (
    !Number.isFinite(anchor) ||
    !Number.isInteger(anchor) ||
    anchor < SUPPRESSION_ANCHOR_MIN ||
    anchor > SUPPRESSION_ANCHOR_MAX
  ) {
    return refusal('bad_anchor_keep'); // T4
  }

  const cutoffAt = now - retentionDays * MS_PER_DAY;

  const decisions = new Map<string, SuppressionDecision>();
  const legible: Parsed[] = [];
  let quarantined = 0;

  for (const row of candidates) {
    const id = String(row.id);
    const at = parseInstant(row.suppressedAt);
    const conditionKey = parseCondition(row.conditionKey);
    // T5/T9: tudo que não se entende — inclusive relógio no futuro — fica.
    if (
      at === null ||
      conditionKey === null ||
      !isChannel(row.channel) ||
      !isWindow(row.windowMinutes) ||
      at > now
    ) {
      quarantined += 1;
      decisions.set(id, { id, outcome: 'quarantine', reason: 'ilegivel' });
      continue;
    }
    legible.push({ id, at, conditionKey });
  }

  // T4 — âncora por condição: as N mais recentes de cada condição.
  const byCondition = new Map<string, Parsed[]>();
  for (const row of legible) {
    const bucket = byCondition.get(row.conditionKey);
    if (bucket) bucket.push(row);
    else byCondition.set(row.conditionKey, [row]);
  }
  const anchored = new Set<string>();
  for (const bucket of byCondition.values()) {
    // T8: desempate estável por id decrescente.
    const sorted = [...bucket].sort(
      (a, b) => b.at - a.at || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
    );
    for (const row of sorted.slice(0, anchor)) anchored.add(row.id);
  }

  const expired: Parsed[] = [];
  let kept = 0;
  let anchoredCount = 0;

  for (const row of legible) {
    const isExpired = row.at < cutoffAt; // T3: empate preserva
    if (anchored.has(row.id)) {
      if (isExpired) {
        anchoredCount += 1;
        decisions.set(row.id, { id: row.id, outcome: 'anchor', reason: 'ancora_da_condicao' });
      } else {
        kept += 1;
        decisions.set(row.id, { id: row.id, outcome: 'keep', reason: 'dentro_do_prazo' });
      }
      continue;
    }
    if (isExpired) {
      expired.push(row);
      continue;
    }
    kept += 1;
    decisions.set(row.id, { id: row.id, outcome: 'keep', reason: 'dentro_do_prazo' });
  }

  // T6/T8: mais antigas primeiro, desempate por id crescente.
  expired.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const doomed = expired.slice(0, batchCap);
  const deferredRows = expired.slice(batchCap);

  for (const row of doomed) {
    decisions.set(row.id, { id: row.id, outcome: 'delete', reason: 'vencida' });
  }
  for (const row of deferredRows) {
    decisions.set(row.id, { id: row.id, outcome: 'defer', reason: 'teto_de_lote' });
  }

  return {
    ok: true,
    cutoffAt,
    retentionDays,
    batchCap,
    anchorPerCondition: anchor,
    examined: candidates.length,
    deleted: doomed.length,
    kept,
    anchored: anchoredCount,
    quarantined,
    deferred: deferredRows.length,
    capped: deferredRows.length > 0,
    deleteIds: doomed.map((r) => r.id),
    decisions: [...decisions.values()],
  };
}

/** T7 — contabilidade fechada. */
export function suppressionPlanIsBalanced(plan: SuppressionPurgePlan): boolean {
  if (!plan.ok) return plan.examined === 0;
  return (
    plan.deleted + plan.kept + plan.anchored + plan.quarantined + plan.deferred === plan.examined
  );
}
