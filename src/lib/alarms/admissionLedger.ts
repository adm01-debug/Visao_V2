/**
 * Onda 227 — Livro de admissão: contabilidade auditável das decisões.
 *
 * Contexto: a Onda 226 deu ao sistema uma porta única para decidir se um
 * evento vira alarme. Uma porta sem livro é uma porta cega: ninguém consegue
 * responder "esta câmera está silenciosa porque não acontece nada, ou porque
 * ninguém a vigia?". As duas situações são visualmente idênticas no painel e
 * radicalmente diferentes na vida real — a segunda é um buraco de cobertura.
 *
 * Este módulo é o livro-caixa dessas decisões. Ele não decide nada: só
 * contabiliza o que `admitEvent` decidiu, de forma fechada e comutativa.
 *
 * Leis (L1–L8):
 *  L1. Contabilidade fechada: `total = admitted + soma(refusals)`. Nenhum
 *      evento entra sem sair num balde; nenhum balde inventa evento.
 *  L2. Cada evento é contado **uma única vez**, pelo motivo global do
 *      veredito. Contar por esquema inflaria o denominador e faria uma
 *      origem com 3 esquemas parecer 3× mais ativa.
 *  L3. A janela é um corte **declarado** pelo chamador. Evento anterior ao
 *      corte não entra e é contado em `droppedOutOfWindow` — descarte
 *      silencioso é falsificação de auditoria.
 *  L4. Evento sem relógio válido é contado (motivo `indeterminate`) mas nunca
 *      datado: não move `firstAt`/`lastAt`.
 *  L5. A ordem de chegada não altera nenhum total. Só `firstAt`/`lastAt`
 *      dependem dos instantes, nunca da sequência de inserção.
 *  L6. Cobertura de uma origem: com ≥1 admissão é `covered`; com eventos mas
 *      nenhuma admissão é `gap` (classificado pelo motivo dominante); sem
 *      evento algum é `no_data` — **nunca** "coberta". Ausência de prova não
 *      é prova de cobertura.
 *  L7. Fundir dois livros é comutativo e associativo: agregação por câmera,
 *      por sítio ou por período dá o mesmo resultado em qualquer ordem.
 *  L8. Cardinalidade tem teto declarado. Ao estourar, o excedente vai para o
 *      balde `__other__`, sempre visível, com a contagem de origens ocultas.
 */

import type { AdmissionReason, AdmissionVerdict } from './eventAdmission';

export const ADMISSION_REASONS: readonly AdmissionReason[] = [
  'admitted',
  'admitted_degraded',
  'indeterminate',
  'out_of_window',
  'inoperative',
  'disabled',
  'source_missing',
  'no_scheme',
];

/** Balde reservado ao excedente de cardinalidade (L8). */
export const OTHER_BUCKET = '__other__';

export type ReasonCounts = Record<AdmissionReason, number>;

export interface SourceLedger {
  readonly sourceId: string;
  readonly total: number;
  readonly admitted: number;
  readonly counts: ReasonCounts;
  /** Epoch ms do primeiro/último evento **datado** (L4). */
  readonly firstAt: number | null;
  readonly lastAt: number | null;
  /** Quantas origens distintas foram fundidas neste balde (>1 só em `__other__`). */
  readonly mergedSources: number;
}

export interface AdmissionLedger {
  readonly total: number;
  readonly admitted: number;
  readonly counts: ReasonCounts;
  readonly droppedOutOfWindow: number;
  readonly bySource: readonly SourceLedger[];
  /** Corte declarado (L3); `null` = sem janela. */
  readonly windowStartAt: number | null;
  readonly maxSources: number;
}

export type CoverageStatus = 'covered' | 'gap' | 'no_data';

export interface CoverageVerdict {
  readonly sourceId: string;
  readonly status: CoverageStatus;
  /** Motivo dominante quando `gap`; `null` nos demais. */
  readonly dominantReason: AdmissionReason | null;
  readonly total: number;
  readonly admitted: number;
}

export interface LedgerOptions {
  /** Eventos anteriores a este instante não entram (L3). */
  readonly windowStartAt?: number | null;
  /** Teto de origens distintas antes do balde `__other__` (L8). */
  readonly maxSources?: number;
}

export const DEFAULT_MAX_SOURCES = 200;

const zeroCounts = (): ReasonCounts => {
  const out = {} as Record<AdmissionReason, number>;
  for (const r of ADMISSION_REASONS) out[r] = 0;
  return out;
};

const norm = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const finiteAt = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const isAdmission = (reason: AdmissionReason): boolean =>
  reason === 'admitted' || reason === 'admitted_degraded';

interface MutableSource {
  sourceId: string;
  total: number;
  admitted: number;
  counts: ReasonCounts;
  firstAt: number | null;
  lastAt: number | null;
  merged: Set<string>;
}

export interface LedgerEntry {
  readonly sourceId: string;
  /** Epoch ms; inválido/ausente ⇒ evento entra sem data (L4). */
  readonly at: number | null | undefined;
  readonly verdict: Pick<AdmissionVerdict, 'reason'>;
}

const emptySource = (sourceId: string): MutableSource => ({
  sourceId,
  total: 0,
  admitted: 0,
  counts: zeroCounts(),
  firstAt: null,
  lastAt: null,
  merged: new Set<string>(),
});

const minAt = (a: number | null, b: number | null): number | null =>
  a === null ? b : b === null ? a : Math.min(a, b);
const maxAt = (a: number | null, b: number | null): number | null =>
  a === null ? b : b === null ? a : Math.max(a, b);

/**
 * Constrói o livro a partir das decisões já tomadas.
 *
 * Determinístico e independente da ordem (L5/L7): a ordenação de saída é
 * estável por `sourceId`, com `__other__` sempre por último.
 */
export function buildAdmissionLedger(
  entries: readonly LedgerEntry[],
  options: LedgerOptions = {},
): AdmissionLedger {
  const windowStartAt = finiteAt(options.windowStartAt);
  const maxSources =
    typeof options.maxSources === 'number' && Number.isFinite(options.maxSources)
      ? Math.max(1, Math.floor(options.maxSources))
      : DEFAULT_MAX_SOURCES;

  const counts = zeroCounts();
  let total = 0;
  let admitted = 0;
  let droppedOutOfWindow = 0;
  const buckets = new Map<string, MutableSource>();

  // A escolha de quais origens ficam nomeadas precisa ser independente da
  // ordem de chegada (L5): decide-se pelo conjunto de identificadores, não
  // por quem apareceu primeiro.
  const admitted_ids = new Set<string>();
  for (const e of Array.isArray(entries) ? entries : []) {
    const at = finiteAt(e?.at);
    if (windowStartAt !== null && at !== null && at < windowStartAt) continue;
    const id = norm(e?.sourceId);
    admitted_ids.add(id === '' ? OTHER_BUCKET : id);
  }
  const named = new Set(
    [...admitted_ids]
      .filter((id) => id !== OTHER_BUCKET)
      .sort()
      .slice(0, maxSources),
  );

  for (const entry of Array.isArray(entries) ? entries : []) {
    const reason = entry?.verdict?.reason as AdmissionReason | undefined;
    if (!reason || !ADMISSION_REASONS.includes(reason)) continue;

    const at = finiteAt(entry?.at);
    // L3 — descarte declarado, nunca silencioso. Evento sem data jamais é
    // descartado pela janela: não há como afirmar que ele é antigo.
    if (windowStartAt !== null && at !== null && at < windowStartAt) {
      droppedOutOfWindow += 1;
      continue;
    }

    const rawId = norm(entry?.sourceId);
    const key = rawId !== '' && named.has(rawId) ? rawId : OTHER_BUCKET;

    total += 1;
    counts[reason] += 1;
    if (isAdmission(reason)) admitted += 1;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = emptySource(key);
      buckets.set(key, bucket);
    }
    bucket.total += 1;
    bucket.counts[reason] += 1;
    if (isAdmission(reason)) bucket.admitted += 1;
    bucket.merged.add(rawId === '' ? OTHER_BUCKET : rawId);
    if (at !== null) {
      bucket.firstAt = minAt(bucket.firstAt, at);
      bucket.lastAt = maxAt(bucket.lastAt, at);
    }
  }

  const bySource = [...buckets.values()]
    .sort((a, b) => {
      if (a.sourceId === OTHER_BUCKET) return 1;
      if (b.sourceId === OTHER_BUCKET) return -1;
      return a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0;
    })
    .map<SourceLedger>((b) => ({
      sourceId: b.sourceId,
      total: b.total,
      admitted: b.admitted,
      counts: { ...b.counts },
      firstAt: b.firstAt,
      lastAt: b.lastAt,
      mergedSources: b.merged.size,
    }));

  return { total, admitted, counts, droppedOutOfWindow, bySource, windowStartAt, maxSources };
}

/**
 * L7 — fusão associativa e comutativa de livros.
 *
 * A janela do resultado é a **mais recente** entre as partes: afirmar uma
 * janela maior que a efetivamente coberta por uma das partes seria prometer
 * dados que não existem.
 */
export function mergeAdmissionLedgers(
  ledgers: readonly AdmissionLedger[],
): AdmissionLedger {
  const list = (Array.isArray(ledgers) ? ledgers : []).filter(Boolean);
  if (list.length === 0) {
    return {
      total: 0,
      admitted: 0,
      counts: zeroCounts(),
      droppedOutOfWindow: 0,
      bySource: [],
      windowStartAt: null,
      maxSources: DEFAULT_MAX_SOURCES,
    };
  }

  const counts = zeroCounts();
  let total = 0;
  let admitted = 0;
  let dropped = 0;
  let windowStartAt: number | null = null;
  let maxSources = 0;
  const buckets = new Map<string, MutableSource>();

  for (const l of list) {
    total += l.total;
    admitted += l.admitted;
    dropped += l.droppedOutOfWindow;
    for (const r of ADMISSION_REASONS) counts[r] += l.counts[r] ?? 0;
    windowStartAt = maxAt(windowStartAt, finiteAt(l.windowStartAt));
    maxSources = Math.max(maxSources, l.maxSources ?? DEFAULT_MAX_SOURCES);

    for (const s of l.bySource) {
      let bucket = buckets.get(s.sourceId);
      if (!bucket) {
        bucket = emptySource(s.sourceId);
        buckets.set(s.sourceId, bucket);
      }
      bucket.total += s.total;
      bucket.admitted += s.admitted;
      for (const r of ADMISSION_REASONS) bucket.counts[r] += s.counts[r] ?? 0;
      bucket.firstAt = minAt(bucket.firstAt, s.firstAt);
      bucket.lastAt = maxAt(bucket.lastAt, s.lastAt);
      // `mergedSources` some como identidade na fusão: guardamos o máximo,
      // pois a mesma origem aparecendo em dois livros continua sendo uma.
      bucket.merged.add(`#${s.mergedSources}`);
    }
  }

  const bySource = [...buckets.values()]
    .sort((a, b) => {
      if (a.sourceId === OTHER_BUCKET) return 1;
      if (b.sourceId === OTHER_BUCKET) return -1;
      return a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0;
    })
    .map<SourceLedger>((b) => ({
      sourceId: b.sourceId,
      total: b.total,
      admitted: b.admitted,
      counts: { ...b.counts },
      firstAt: b.firstAt,
      lastAt: b.lastAt,
      mergedSources: Math.max(
        1,
        ...[...b.merged].map((m) => Number.parseInt(m.slice(1), 10) || 1),
      ),
    }));

  return {
    total,
    admitted,
    counts,
    droppedOutOfWindow: dropped,
    bySource,
    windowStartAt,
    maxSources: maxSources || DEFAULT_MAX_SOURCES,
  };
}

/**
 * L6 — veredito de cobertura por origem.
 *
 * `expectedSourceIds` é a lista do inventário: origens que **deveriam**
 * aparecer. Uma origem esperada sem nenhum evento é `no_data` — o silêncio
 * mais perigoso de todos, porque no painel parece paz.
 */
export function assessCoverage(
  ledger: AdmissionLedger,
  expectedSourceIds: readonly string[] = [],
): readonly CoverageVerdict[] {
  const bySource = new Map(ledger?.bySource?.map((s) => [s.sourceId, s]) ?? []);
  const ids = new Set<string>();
  for (const s of ledger?.bySource ?? []) if (s.sourceId !== OTHER_BUCKET) ids.add(s.sourceId);
  for (const raw of Array.isArray(expectedSourceIds) ? expectedSourceIds : []) {
    const id = norm(raw);
    if (id !== '') ids.add(id);
  }

  return [...ids].sort().map<CoverageVerdict>((sourceId) => {
    const s = bySource.get(sourceId);
    if (!s || s.total === 0) {
      return { sourceId, status: 'no_data', dominantReason: null, total: 0, admitted: 0 };
    }
    if (s.admitted > 0) {
      return {
        sourceId,
        status: 'covered',
        dominantReason: null,
        total: s.total,
        admitted: s.admitted,
      };
    }
    // Empate resolvido pela precedência de acionabilidade da Onda 226, não
    // pela ordem alfabética: o operador precisa do motivo que ele consegue
    // consertar.
    let dominant: AdmissionReason = 'no_scheme';
    let best = -1;
    for (const r of ADMISSION_REASONS) {
      const c = s.counts[r] ?? 0;
      if (c === 0) continue;
      if (c > best) {
        best = c;
        dominant = r;
      }
    }
    return {
      sourceId,
      status: 'gap',
      dominantReason: dominant,
      total: s.total,
      admitted: 0,
    };
  });
}

/** Invariante L1, exposta para gates e testes. */
export const ledgerIsBalanced = (ledger: AdmissionLedger): boolean => {
  const sum = ADMISSION_REASONS.reduce((acc, r) => acc + (ledger.counts[r] ?? 0), 0);
  const admittedSum = (ledger.counts.admitted ?? 0) + (ledger.counts.admitted_degraded ?? 0);
  const perSource = ledger.bySource.reduce((acc, s) => acc + s.total, 0);
  return sum === ledger.total && admittedSum === ledger.admitted && perSource === ledger.total;
};
