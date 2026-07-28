/**
 * Onda 230 — Guarda de retenção do livro de admissão (Onda 228/229).
 *
 * O livro `admission_ledger_windows` é append-only: cada janela fechada vira
 * uma linha imutável. Sem guarda, ele cresce para sempre e a auditoria (Onda
 * 229) passa a varrer lixo antigo — o painel fica lento e, pior, a leitura
 * "últimas 24h" começa a competir com anos de histórico no mesmo índice.
 *
 * Apagar prova, porém, é um ato grave. Esta régua é a **única** autoridade
 * sobre o que pode sair do livro, e o espelho SQL (`purge_admission_ledger`)
 * é obrigado a concordar com ela linha a linha.
 *
 * Leis (G1–G8):
 *  G1. Corte declarado: o expurgo ancora num instante recebido (`now`), nunca
 *      num relógio implícito. Sem instante legível, nada é apagado.
 *  G2. O prazo conta pelo **fim** da janela (`windowEnd`), nunca pela criação
 *      da linha: uma janela antiga inserida hoje já nasceu vencida, e uma
 *      janela recente inserida com atraso continua protegida.
 *  G3. Janela ainda dentro do prazo **jamais** é apagada. Empate no corte
 *      exato preserva (`windowEnd >= cutoff` fica).
 *  G4. Linha ilegível (janela sem data válida, fim antes do início, origem em
 *      branco) nunca é apagada por conveniência: vira `quarantined`. Apagar o
 *      que não se entende é destruir prova para esconder um defeito.
 *  G5. Prazo fora da faixa declarada (30–3650 dias) recusa o expurgo inteiro:
 *      um parâmetro errado não pode virar apagamento em massa.
 *  G6. Teto de lote obrigatório (1..500.000). Quando o candidato excede o
 *      teto, o expurgo é **parcial e declarado** (`capped: true`), removendo
 *      os mais antigos primeiro — nunca um recorte arbitrário.
 *  G7. Contabilidade fechada: `deleted + kept + quarantined + deferred`
 *      sempre é igual ao total examinado.
 *  G8. Determinismo: a mesma entrada produz o mesmo plano, e a ordem das
 *      linhas de entrada nunca altera o resultado.
 */

/** Faixa aceita para o prazo de guarda, em dias (G5). */
export const RETENTION_DAYS_MIN = 30;
export const RETENTION_DAYS_MAX = 3650;
/** Prazo padrão: 1 ano de prova de cobertura. */
export const RETENTION_DAYS_DEFAULT = 365;

/** Faixa aceita para o teto de lote (G6). */
export const BATCH_CAP_MIN = 1;
export const BATCH_CAP_MAX = 500_000;
export const BATCH_CAP_DEFAULT = 50_000;

const MS_PER_DAY = 86_400_000;

/** Linha candidata, no formato mínimo lido do banco. */
export interface RetentionCandidate {
  readonly id: string;
  readonly sourceId?: unknown;
  readonly windowStart?: unknown;
  readonly windowEnd?: unknown;
}

export type RetentionOutcome = 'delete' | 'keep' | 'quarantine' | 'defer';

export interface RetentionDecision {
  readonly id: string;
  readonly outcome: RetentionOutcome;
  /** Motivo legível — sempre presente, inclusive em `delete`. */
  readonly reason:
    | 'expired'
    | 'within_retention'
    | 'unreadable_window'
    | 'blank_source'
    | 'batch_cap';
  /** Fim da janela em ms, quando legível. */
  readonly windowEndAt: number | null;
}

export interface RetentionPlan {
  readonly ok: true;
  /** Instante de corte efetivo (`now - retentionDays`). */
  readonly cutoffAt: number;
  readonly retentionDays: number;
  readonly batchCap: number;
  readonly examined: number;
  readonly deleted: number;
  readonly kept: number;
  readonly quarantined: number;
  /** Vencidas que não couberam no lote desta rodada (G6). */
  readonly deferred: number;
  readonly capped: boolean;
  /** Decisões em ordem estável por `id`. */
  readonly decisions: readonly RetentionDecision[];
}

export interface RetentionRefusal {
  readonly ok: false;
  readonly refusal: 'bad_now' | 'bad_retention_days' | 'bad_batch_cap';
}

export type RetentionResult = RetentionPlan | RetentionRefusal;

export interface RetentionOptions {
  readonly now: number;
  readonly retentionDays?: number;
  readonly batchCap?: number;
}

/** Lê um instante em ms a partir de `number | string | Date`; `null` se ilegível. */
export function readInstant(value: unknown): number | null {
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

function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

/**
 * Constrói o plano de expurgo. Função pura: não conhece banco nem relógio.
 */
export function planAdmissionPurge(
  candidates: readonly RetentionCandidate[],
  options: RetentionOptions,
): RetentionResult {
  const now = readInstant(options.now);
  if (now === null) return { ok: false, refusal: 'bad_now' };

  const retentionDays = options.retentionDays ?? RETENTION_DAYS_DEFAULT;
  if (!isIntegerInRange(retentionDays, RETENTION_DAYS_MIN, RETENTION_DAYS_MAX)) {
    return { ok: false, refusal: 'bad_retention_days' };
  }

  const batchCap = options.batchCap ?? BATCH_CAP_DEFAULT;
  if (!isIntegerInRange(batchCap, BATCH_CAP_MIN, BATCH_CAP_MAX)) {
    return { ok: false, refusal: 'bad_batch_cap' };
  }

  const cutoffAt = now - retentionDays * MS_PER_DAY;

  interface Staged {
    readonly id: string;
    readonly outcome: RetentionOutcome;
    readonly reason: RetentionDecision['reason'];
    readonly windowEndAt: number | null;
  }

  const staged: Staged[] = [];

  for (const row of candidates) {
    const id = typeof row?.id === 'string' ? row.id : '';
    if (id === '') continue; // linha sem identidade não é endereçável.

    const source = typeof row.sourceId === 'string' ? row.sourceId.trim() : '';
    if (row.sourceId !== undefined && source === '') {
      staged.push({ id, outcome: 'quarantine', reason: 'blank_source', windowEndAt: null });
      continue;
    }

    const start = readInstant(row.windowStart);
    const end = readInstant(row.windowEnd);
    // G4: janela ilegível ou invertida nunca é apagada.
    if (end === null || (start !== null && end <= start)) {
      staged.push({ id, outcome: 'quarantine', reason: 'unreadable_window', windowEndAt: end });
      continue;
    }

    // G3: empate no corte preserva.
    if (end >= cutoffAt) {
      staged.push({ id, outcome: 'keep', reason: 'within_retention', windowEndAt: end });
      continue;
    }

    staged.push({ id, outcome: 'delete', reason: 'expired', windowEndAt: end });
  }

  // G6: teto de lote — os mais antigos saem primeiro; desempate estável por id.
  const expired = staged
    .filter((s) => s.outcome === 'delete')
    .sort((a, b) => (a.windowEndAt! - b.windowEndAt!) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const deferredIds = new Set(expired.slice(batchCap).map((s) => s.id));

  const decisions: RetentionDecision[] = staged
    .map((s) =>
      deferredIds.has(s.id)
        ? ({ id: s.id, outcome: 'defer', reason: 'batch_cap', windowEndAt: s.windowEndAt } as const)
        : ({ id: s.id, outcome: s.outcome, reason: s.reason, windowEndAt: s.windowEndAt } as const),
    )
    // G8: ordem estável e independente da entrada.
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const deleted = decisions.filter((d) => d.outcome === 'delete').length;
  const kept = decisions.filter((d) => d.outcome === 'keep').length;
  const quarantined = decisions.filter((d) => d.outcome === 'quarantine').length;
  const deferred = decisions.filter((d) => d.outcome === 'defer').length;

  return {
    ok: true,
    cutoffAt,
    retentionDays,
    batchCap,
    examined: decisions.length,
    deleted,
    kept,
    quarantined,
    deferred,
    capped: deferred > 0,
    decisions,
  };
}

/** Verifica a contabilidade fechada (G7) — usado por testes e gate. */
export function planIsBalanced(plan: RetentionPlan): boolean {
  return plan.deleted + plan.kept + plan.quarantined + plan.deferred === plan.examined;
}
