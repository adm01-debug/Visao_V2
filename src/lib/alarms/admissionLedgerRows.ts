/**
 * Onda 229 — Leitura desconfiada do livro de admissão persistido (Onda 228).
 *
 * Contexto: a Onda 227 criou o livro em memória e a Onda 228 o persistiu com
 * contabilidade fechada garantida por CHECK. Mesmo assim, a UI **não pode**
 * assumir que a linha lida é boa: réplica antiga, migração futura, coluna
 * adicionada, `jsonb` com motivo desconhecido — qualquer um desses cenários
 * produz uma linha que não fecha. Somar uma linha dessas ao total é pior do
 * que ignorá-la: transforma um erro de dado em um número de auditoria.
 *
 * Este módulo converte linhas persistidas em `AdmissionLedger` reutilizando a
 * fusão comutativa da Onda 227. Ele não recalcula veredito nenhum.
 *
 * Leis (R1–R7):
 *  R1. Linha só é contabilizada se **fecha**: `soma(counts) === total` e
 *      `admitted + admitted_degraded === admitted`. Linha que não fecha é
 *      quarentenada em `malformed`, nunca saneada por conveniência.
 *  R2. Motivo desconhecido no `counts` invalida a linha (R1). Ignorar um
 *      balde desconhecido reduziria o denominador em silêncio.
 *  R3. Corte declarado: linha cuja janela termina antes do corte não entra e
 *      é contada em `outOfRange`. Descarte silencioso é falsificação.
 *  R4. Data inválida nunca data: `first_at`/`last_at` ilegíveis viram `null`
 *      sem impedir a contabilização da linha.
 *  R5. Origem vista **apenas** em linha malformada nunca é `covered`: ela é
 *      reportada como ilegível e tratada como `no_data` na cobertura.
 *  R6. A fusão é comutativa e associativa (herdada da Onda 227): a ordem das
 *      linhas jamais altera totais.
 *  R7. `source_id` em branco é lixo estrutural: a linha é malformada, não
 *      um balde vazio.
 */

import {
  ADMISSION_REASONS,
  DEFAULT_MAX_SOURCES,
  assessCoverage,
  mergeAdmissionLedgers,
  type AdmissionLedger,
  type CoverageVerdict,
  type ReasonCounts,
  type SourceLedger,
} from './admissionLedger';
import type { AdmissionReason } from './eventAdmission';

/** Linha crua vinda de `public.admission_ledger_windows`. */
export interface AdmissionWindowRow {
  readonly source_id?: unknown;
  readonly window_start?: unknown;
  readonly window_end?: unknown;
  readonly counts?: unknown;
  readonly total?: unknown;
  readonly admitted?: unknown;
  readonly dropped_out_of_window?: unknown;
  readonly first_at?: unknown;
  readonly last_at?: unknown;
}

export type MalformedReason =
  | 'blank_source'
  | 'bad_window'
  | 'bad_totals'
  | 'unknown_reason'
  | 'unbalanced';

export interface MalformedRow {
  readonly sourceId: string;
  readonly reason: MalformedReason;
}

export interface LedgerRowsReport {
  readonly ledger: AdmissionLedger;
  /** Linhas aceitas na contabilidade. */
  readonly accepted: number;
  /** Linhas fora do corte declarado (R3). */
  readonly outOfRange: number;
  /** Linhas quarentenadas (R1/R2/R7), em ordem estável. */
  readonly malformed: readonly MalformedRow[];
  /** Origens que só apareceram em linha malformada (R5). */
  readonly unreadableSources: readonly string[];
}

export interface RowsOptions {
  /** Epoch ms; linha que termina antes disso não entra (R3). */
  readonly windowStartAt?: number | null;
  readonly maxSources?: number;
}

const REASON_SET = new Set<string>(ADMISSION_REASONS);

const zeroCounts = (): ReasonCounts => {
  const out = {} as Record<AdmissionReason, number>;
  for (const r of ADMISSION_REASONS) out[r] = 0;
  return out;
};

const asInt = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : null;
};

/** R4 — instante ilegível vira `null`, nunca `0` (que seria 1970). */
const asEpoch = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
};

const parseCounts = (
  raw: unknown,
): { counts: ReasonCounts; sum: number } | MalformedReason => {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return 'bad_totals';
  const counts = zeroCounts();
  let sum = 0;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!REASON_SET.has(key)) return 'unknown_reason'; // R2
    const n = asInt(value);
    if (n === null) return 'bad_totals';
    counts[key as AdmissionReason] = n;
    sum += n;
  }
  return { counts, sum };
};

/**
 * Converte linhas persistidas num livro único e auditável.
 *
 * Determinístico: a mesma coleção, em qualquer ordem, produz o mesmo relatório
 * (a lista de malformadas é ordenada por origem e motivo).
 */
export function ledgerFromRows(
  rows: readonly AdmissionWindowRow[],
  options: RowsOptions = {},
): LedgerRowsReport {
  const cut = typeof options.windowStartAt === 'number' && Number.isFinite(options.windowStartAt)
    ? options.windowStartAt
    : null;
  const maxSources =
    typeof options.maxSources === 'number' && options.maxSources > 0
      ? Math.floor(options.maxSources)
      : DEFAULT_MAX_SOURCES;

  const partials: AdmissionLedger[] = [];
  const malformed: MalformedRow[] = [];
  const goodSources = new Set<string>();
  const badSources = new Set<string>();
  let accepted = 0;
  let outOfRange = 0;

  for (const row of Array.isArray(rows) ? rows : []) {
    const sourceId = typeof row?.source_id === 'string' ? row.source_id.trim() : '';
    if (sourceId === '') {
      malformed.push({ sourceId: '', reason: 'blank_source' }); // R7
      continue;
    }

    const start = asEpoch(row?.window_start);
    const end = asEpoch(row?.window_end);
    if (start === null || end === null || end <= start) {
      malformed.push({ sourceId, reason: 'bad_window' });
      badSources.add(sourceId);
      continue;
    }
    if (cut !== null && end <= cut) {
      outOfRange += 1; // R3
      continue;
    }

    const total = asInt(row?.total);
    const admitted = asInt(row?.admitted);
    const dropped = asInt(row?.dropped_out_of_window) ?? 0;
    if (total === null || admitted === null || admitted > total) {
      malformed.push({ sourceId, reason: 'bad_totals' });
      badSources.add(sourceId);
      continue;
    }

    const parsed = parseCounts(row?.counts);
    if (typeof parsed === 'string') {
      malformed.push({ sourceId, reason: parsed });
      badSources.add(sourceId);
      continue;
    }

    const mirrored = parsed.counts.admitted + parsed.counts.admitted_degraded;
    if (parsed.sum !== total || mirrored !== admitted) {
      malformed.push({ sourceId, reason: 'unbalanced' }); // R1
      badSources.add(sourceId);
      continue;
    }

    const first = asEpoch(row?.first_at);
    const last = asEpoch(row?.last_at);
    const dated = first !== null && last !== null && last >= first;

    const source: SourceLedger = {
      sourceId,
      total,
      admitted,
      counts: parsed.counts,
      firstAt: dated ? first : null,
      lastAt: dated ? last : null,
      mergedSources: 1,
    };

    partials.push({
      total,
      admitted,
      counts: parsed.counts,
      droppedOutOfWindow: dropped,
      bySource: [source],
      windowStartAt: null,
      maxSources,
    });
    goodSources.add(sourceId);
    accepted += 1;
  }

  const merged = mergeAdmissionLedgers(partials);
  const ledger: AdmissionLedger = { ...merged, windowStartAt: cut, maxSources };

  malformed.sort((a, b) =>
    a.sourceId === b.sourceId
      ? a.reason < b.reason
        ? -1
        : a.reason > b.reason
          ? 1
          : 0
      : a.sourceId < b.sourceId
        ? -1
        : 1,
  );

  const unreadable = [...badSources].filter((id) => !goodSources.has(id)).sort(); // R5

  return {
    ledger,
    accepted,
    outOfRange,
    malformed,
    unreadableSources: unreadable,
  };
}

export interface CoverageSummary {
  readonly covered: number;
  readonly gap: number;
  readonly noData: number;
  readonly unreadable: number;
  readonly verdicts: readonly CoverageVerdict[];
}

/**
 * Cobertura pronta para a UI: a lista esperada do inventário entra sempre,
 * e origens ilegíveis (R5) nunca são apresentadas como cobertas.
 */
export function summarizeCoverage(
  report: LedgerRowsReport,
  expectedSourceIds: readonly string[] = [],
): CoverageSummary {
  const expected = new Set<string>();
  for (const raw of Array.isArray(expectedSourceIds) ? expectedSourceIds : []) {
    const id = typeof raw === 'string' ? raw.trim() : '';
    if (id !== '') expected.add(id);
  }
  for (const id of report.unreadableSources) expected.add(id);

  const verdicts = assessCoverage(report.ledger, [...expected]);
  let covered = 0;
  let gap = 0;
  let noData = 0;
  for (const v of verdicts) {
    if (v.status === 'covered') covered += 1;
    else if (v.status === 'gap') gap += 1;
    else noData += 1;
  }
  return {
    covered,
    gap,
    noData,
    unreadable: report.unreadableSources.length,
    verdicts,
  };
}
