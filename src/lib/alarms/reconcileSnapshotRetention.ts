/**
 * Onda 237 — Guarda de retenção do histórico de conciliações (Onda 235).
 *
 * `admission_reconcile_snapshots` é append-only e ganha uma linha por dia,
 * para sempre. É a única tabela `%_snapshots` fora do registro de retenção
 * (Onda 134): cresce sem vigia e, pior, a régua de tendência (Onda 235) lê a
 * série inteira a cada avaliação — o custo da leitura sobe com a idade do
 * sistema, não com o problema observado.
 *
 * Apagar histórico probatório, porém, é grave por um motivo específico deste
 * domínio: **falta de histórico não alerta**. A régua da Onda 235 devolve
 * `no_history` quando a série é curta, e `no_history` é silêncio, não aviso.
 * Um expurgo distraído transformaria "não sei" em "está tudo bem". Daí a lei
 * da âncora (N4).
 *
 * Leis (N1–N8):
 *  N1. Corte declarado: o expurgo ancora num instante recebido (`now`). Sem
 *      relógio legível, nada é apagado (`bad_now`).
 *  N2. Prazo dentro da faixa 90–3650 dias. Mais curto que 90 dias apagaria a
 *      janela que a própria régua de tendência consulta; fora da faixa recusa
 *      o expurgo inteiro em vez de "corrigir" o parâmetro.
 *  N3. O prazo conta por `observedAt` (o instante da foto), nunca por
 *      `createdAt`: uma foto datada no passado já nasce vencida e uma foto
 *      recente gravada com atraso continua protegida. Empate no corte exato
 *      **preserva** (`observedAt >= cutoff` fica).
 *  N4. Âncora: as `ANCHOR_KEEP` fotos legíveis mais recentes nunca são
 *      apagadas, mesmo vencidas. Se o cron ficar meses parado, o expurgo não
 *      pode zerar a série e converter cegueira em bom estado.
 *  N5. Foto ilegível (instante inválido ou veredito fora do catálogo) vai para
 *      quarentena, nunca para o lixo: apagar o que não se entende é destruir a
 *      prova de um defeito.
 *  N6. Teto de lote obrigatório (1..100.000). Excedente vira expurgo parcial e
 *      **declarado** (`capped: true`), sempre removendo as mais antigas.
 *  N7. Contabilidade fechada: `deleted + kept + anchored + quarantined +
 *      deferred === examined`.
 *  N8. Determinismo: a ordem das linhas de entrada nunca altera o resultado.
 */

/** Faixa aceita para o prazo de guarda, em dias (N2). */
export const SNAPSHOT_RETENTION_DAYS_MIN = 90;
export const SNAPSHOT_RETENTION_DAYS_MAX = 3650;
/** Padrão: 2 anos de série histórica. */
export const SNAPSHOT_RETENTION_DAYS_DEFAULT = 730;

/** Faixa aceita para o teto de lote (N6). */
export const SNAPSHOT_BATCH_CAP_MIN = 1;
export const SNAPSHOT_BATCH_CAP_MAX = 100_000;
export const SNAPSHOT_BATCH_CAP_DEFAULT = 10_000;

/**
 * Quantas fotos legíveis mais recentes ficam intocáveis (N4).
 * 7 é o mesmo tamanho de série que a régua de tendência considera suficiente
 * para um veredito `persistent`; abaixo disso o expurgo cegaria o alerta.
 */
export const ANCHOR_KEEP = 7;

const MS_PER_DAY = 86_400_000;

/** Vereditos aceitos — espelha o CHECK da tabela (N5). */
export const SNAPSHOT_VERDICTS = [
  'reconciled',
  'settling',
  'no_run',
  'unaccounted',
  'indeterminate',
] as const;

export type SnapshotVerdict = (typeof SNAPSHOT_VERDICTS)[number];

/** Linha candidata, no formato mínimo lido do banco. */
export interface SnapshotCandidate {
  /** `bigint` chega como string pela Data API; aceitamos ambos. */
  readonly id: string | number;
  readonly observedAt?: unknown;
  readonly verdict?: unknown;
}

export type SnapshotOutcome = 'delete' | 'keep' | 'anchor' | 'quarantine' | 'defer';

export interface SnapshotDecision {
  readonly id: string;
  readonly outcome: SnapshotOutcome;
  readonly reason:
    | 'expired'
    | 'within_retention'
    | 'anchor_window'
    | 'unreadable_observed_at'
    | 'unknown_verdict'
    | 'batch_cap';
  readonly observedAtMs: number | null;
}

export interface SnapshotPurgePlan {
  readonly ok: true;
  readonly cutoffAt: number;
  readonly retentionDays: number;
  readonly batchCap: number;
  readonly anchorKeep: number;
  readonly examined: number;
  readonly deleted: number;
  readonly kept: number;
  /** Vencidas preservadas apenas pela âncora (N4) — visíveis, nunca implícitas. */
  readonly anchored: number;
  readonly quarantined: number;
  readonly deferred: number;
  readonly capped: boolean;
  readonly decisions: readonly SnapshotDecision[];
}

export interface SnapshotPurgeRefusal {
  readonly ok: false;
  readonly refusal: 'bad_now' | 'bad_retention_days' | 'bad_batch_cap' | 'bad_anchor_keep';
}

export type SnapshotPurgeResult = SnapshotPurgePlan | SnapshotPurgeRefusal;

export interface SnapshotPurgeOptions {
  readonly now: number;
  readonly retentionDays?: number;
  readonly batchCap?: number;
  readonly anchorKeep?: number;
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

function normalizeId(raw: string | number): string {
  if (typeof raw === 'number') return Number.isFinite(raw) ? String(raw) : '';
  return typeof raw === 'string' ? raw.trim() : '';
}

/** Ordena ids numéricos por valor e não-numéricos lexicograficamente, de forma estável. */
function compareIds(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  const bothNumeric = Number.isFinite(na) && Number.isFinite(nb);
  if (bothNumeric && na !== nb) return na - nb;
  if (bothNumeric) return 0;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Constrói o plano de expurgo das fotos de conciliação. Função pura.
 */
export function planSnapshotPurge(
  candidates: readonly SnapshotCandidate[],
  options: SnapshotPurgeOptions,
): SnapshotPurgeResult {
  const now = readInstant(options.now);
  if (now === null) return { ok: false, refusal: 'bad_now' };

  const retentionDays = options.retentionDays ?? SNAPSHOT_RETENTION_DAYS_DEFAULT;
  if (
    !isIntegerInRange(retentionDays, SNAPSHOT_RETENTION_DAYS_MIN, SNAPSHOT_RETENTION_DAYS_MAX)
  ) {
    return { ok: false, refusal: 'bad_retention_days' };
  }

  const batchCap = options.batchCap ?? SNAPSHOT_BATCH_CAP_DEFAULT;
  if (!isIntegerInRange(batchCap, SNAPSHOT_BATCH_CAP_MIN, SNAPSHOT_BATCH_CAP_MAX)) {
    return { ok: false, refusal: 'bad_batch_cap' };
  }

  const anchorKeep = options.anchorKeep ?? ANCHOR_KEEP;
  if (!isIntegerInRange(anchorKeep, 1, 1000)) {
    return { ok: false, refusal: 'bad_anchor_keep' };
  }

  const cutoffAt = now - retentionDays * MS_PER_DAY;

  interface Staged {
    id: string;
    outcome: SnapshotOutcome;
    reason: SnapshotDecision['reason'];
    observedAtMs: number | null;
  }

  const staged: Staged[] = [];
  const seen = new Set<string>();

  for (const row of candidates) {
    const id = normalizeId(row?.id);
    if (id === '' || seen.has(id)) continue; // sem identidade (ou repetida) não é endereçável.
    seen.add(id);

    // N5: veredito fora do catálogo é defeito de escrita, não lixo.
    if (row.verdict !== undefined) {
      const verdict = typeof row.verdict === 'string' ? row.verdict.trim() : '';
      if (!(SNAPSHOT_VERDICTS as readonly string[]).includes(verdict)) {
        staged.push({
          id,
          outcome: 'quarantine',
          reason: 'unknown_verdict',
          observedAtMs: readInstant(row.observedAt),
        });
        continue;
      }
    }

    const observedAtMs = readInstant(row.observedAt);
    if (observedAtMs === null) {
      staged.push({
        id,
        outcome: 'quarantine',
        reason: 'unreadable_observed_at',
        observedAtMs: null,
      });
      continue;
    }

    // N3: empate no corte preserva.
    if (observedAtMs >= cutoffAt) {
      staged.push({ id, outcome: 'keep', reason: 'within_retention', observedAtMs });
      continue;
    }

    staged.push({ id, outcome: 'delete', reason: 'expired', observedAtMs });
  }

  // N4: âncora — as `anchorKeep` fotos legíveis mais recentes ficam, vencidas ou não.
  const readable = staged
    .filter((s) => s.observedAtMs !== null && s.outcome !== 'quarantine')
    .sort(
      (a, b) => (b.observedAtMs! - a.observedAtMs!) || compareIds(b.id, a.id),
    );
  const anchorIds = new Set(readable.slice(0, anchorKeep).map((s) => s.id));

  for (const s of staged) {
    if (s.outcome === 'delete' && anchorIds.has(s.id)) {
      s.outcome = 'anchor';
      s.reason = 'anchor_window';
    }
  }

  // N6: teto de lote — as mais antigas saem primeiro; desempate estável por id.
  const expired = staged
    .filter((s) => s.outcome === 'delete')
    .sort((a, b) => (a.observedAtMs! - b.observedAtMs!) || compareIds(a.id, b.id));

  const deferredIds = new Set(expired.slice(batchCap).map((s) => s.id));

  const decisions: SnapshotDecision[] = staged
    .map((s) =>
      deferredIds.has(s.id)
        ? ({
            id: s.id,
            outcome: 'defer' as const,
            reason: 'batch_cap' as const,
            observedAtMs: s.observedAtMs,
          })
        : ({
            id: s.id,
            outcome: s.outcome,
            reason: s.reason,
            observedAtMs: s.observedAtMs,
          }),
    )
    // N8: ordem estável e independente da entrada.
    .sort((a, b) => compareIds(a.id, b.id));

  const count = (o: SnapshotOutcome): number =>
    decisions.reduce((acc, d) => acc + (d.outcome === o ? 1 : 0), 0);

  const deferred = count('defer');

  return {
    ok: true,
    cutoffAt,
    retentionDays,
    batchCap,
    anchorKeep,
    examined: decisions.length,
    deleted: count('delete'),
    kept: count('keep'),
    anchored: count('anchor'),
    quarantined: count('quarantine'),
    deferred,
    capped: deferred > 0,
    decisions,
  };
}

/** Verifica a contabilidade fechada (N7) — usado por testes e gate. */
export function snapshotPlanIsBalanced(plan: SnapshotPurgePlan): boolean {
  return (
    plan.deleted + plan.kept + plan.anchored + plan.quarantined + plan.deferred ===
    plan.examined
  );
}
