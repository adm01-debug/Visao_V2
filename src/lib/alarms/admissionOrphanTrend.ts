/**
 * Onda 235 — Histórico persistido das conciliações e tendência do órfão.
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 233 mediu o órfão e a Onda 234 o transformou em alerta. Ambas veem
 * **uma foto**. Uma foto não distingue três situações que exigem respostas
 * opostas: um órfão que apareceu agora por uma corrida infeliz, um órfão que
 * está sendo drenado a cada ciclo, e um órfão que cresce todo dia. Sem série
 * histórica, o operador recebe o mesmo alerta crítico nos três casos e aprende
 * a ignorá-lo — que é exatamente como um vazamento de contabilidade sobrevive.
 *
 * Esta régua lê o **histórico persistido** das conciliações
 * (`public.admission_reconcile_snapshots`, append-only) com a mesma
 * desconfiança das Ondas 229/231: linha ilegível nunca vira zero, ordem nunca
 * vem da ordem de chegada, e melhora nunca é apresentada como resolvida.
 *
 * ## Leis (L1–L8)
 *
 *  L1. Só snapshot **legível** entra na série. Linha ilegível não é `0` órfãos:
 *      é ausência de informação, contada num eixo separado. Tratar ilegível
 *      como zero é a forma mais barata de fabricar um "tudo em ordem".
 *  L2. A foto **mais recente** governa o "agora": se o órfão atual é `0`, o
 *      veredito é `clear`, por pior que tenha sido o passado. Histórico não
 *      ressuscita acusação já desfeita.
 *  L3. Histórico curto **nunca** vira "persistente". Órfão vivo com menos de
 *      `PERSIST_SAMPLES` fotos legíveis é `emerging`: há fato, ainda não há
 *      padrão. Confundir os dois inverte a prioridade da fila de manutenção.
 *  L4. Crescimento é **estrito** e medido apenas no bloco contíguo com órfão,
 *      do mais antigo ao mais recente (mesma disciplina da lei I6). Qualquer
 *      queda dentro do bloco desarma o crescimento.
 *  L5. Queda estrita ao longo de todo o bloco é `resolving` — e `resolving`
 *      **emite** (aviso). Um órfão diminuindo continua sendo órfão: silenciar
 *      a melhora é como declarar vitória no meio da drenagem.
 *  L6. Bloco cheio sem crescimento nem queda estritos (empate ou oscilação) é
 *      `persistent`: estabilidade em cima de um erro é o pior dos mundos.
 *  L7. A ordem é sempre `observed_at` decrescente, com desempate estável por
 *      `id`. Nunca a ordem em que as linhas chegaram do banco.
 *  L8. Nenhum veredito viaja sem a série que o sustenta (`trend`), a contagem
 *      de fotos legíveis e a de ilegíveis descartadas.
 *
 * Módulo **puro**: sem banco, sem React, sem relógio global. É a fonte da
 * verdade espelhada por `public.admission_orphan_trend_classify()` e conferida
 * no CI por `scripts/check-admission-trend.ts`.
 */

/** Fotos legíveis consecutivas com órfão que caracterizam padrão (L3/L6). */
export const PERSIST_SAMPLES = 3;

/** Teto de fotos consideradas na janela de tendência. */
export const DEFAULT_WINDOW = 14;

/** Vereditos possíveis do eixo "tendência do órfão". */
export type OrphanTrendVerdict =
  'no_history' | 'clear' | 'emerging' | 'resolving' | 'persistent' | 'growing';

const VERDICT_LABEL: Record<OrphanTrendVerdict, string> = {
  no_history: 'sem histórico legível',
  clear: 'sem órfão na última conciliação',
  emerging: 'órfão recente, sem padrão ainda',
  resolving: 'órfão em queda',
  persistent: 'órfão persistente',
  growing: 'órfão crescente',
};

export function orphanTrendLabel(verdict: OrphanTrendVerdict): string {
  return VERDICT_LABEL[verdict];
}

/** Linha crua vinda do banco — todos os campos suspeitos. */
export interface RawReconcileSnapshotRow {
  readonly id?: unknown;
  readonly observed_at?: unknown;
  readonly verdict?: unknown;
  readonly orphan_count?: unknown;
  readonly expired_stock?: unknown;
  readonly declared_deferred?: unknown;
  readonly drift_stock?: unknown;
}

/** Leitura normalizada de um snapshot. */
export interface ReconcileSnapshotReading {
  readonly id: string;
  readonly status: 'valid' | 'unreadable';
  readonly reason: string | null;
  readonly observedAt: number | null;
  readonly verdict: string | null;
  readonly orphan: number | null;
  readonly expired: number | null;
  readonly deferred: number | null;
  readonly drift: number | null;
}

/** `bigint` do PostgREST chega como string — nunca confiar no tipo. */
function readCount(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && Number.isInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const n = Number(value.trim());
    return Number.isSafeInteger(n) ? n : null;
  }
  return null;
}

function readInstant(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

/** L1 — leitura desconfiada: qualquer campo essencial ausente torna a linha ilegível. */
export function readReconcileSnapshot(
  raw: RawReconcileSnapshotRow | null | undefined,
  index: number
): ReconcileSnapshotReading {
  const row = raw ?? {};
  const id =
    typeof row.id === 'string' && row.id.trim() !== ''
      ? row.id.trim()
      : typeof row.id === 'number' && Number.isFinite(row.id)
        ? String(row.id)
        : `#${index}`;

  const observedAt = readInstant(row.observed_at);
  const orphan = readCount(row.orphan_count);
  const expired = readCount(row.expired_stock);
  const deferred = readCount(row.declared_deferred);
  const drift = readCount(row.drift_stock);
  const verdict =
    typeof row.verdict === 'string' && row.verdict.trim() !== '' ? row.verdict.trim() : null;

  let reason: string | null = null;
  if (observedAt === null) reason = 'observed_at_ilegivel';
  else if (orphan === null) reason = 'orphan_count_ilegivel';
  else if (verdict === null) reason = 'verdict_ausente';
  else if (expired === null) reason = 'expired_stock_ilegivel';

  return {
    id,
    status: reason === null ? 'valid' : 'unreadable',
    reason,
    observedAt,
    verdict,
    orphan,
    expired,
    deferred,
    drift,
  };
}

/** Retrato da tendência, antes de virar alerta ou pintura de tela. */
export interface OrphanTrendAssessment {
  readonly verdict: OrphanTrendVerdict;
  readonly label: string;
  /** Órfão da foto legível mais recente (0 quando não há foto legível). */
  readonly orphanNow: number;
  /** Fotos legíveis consecutivas, da mais recente, com órfão > 0. */
  readonly consecutive: number;
  /** Série de órfãos, da mais antiga para a mais recente, dentro da janela. */
  readonly trend: readonly number[];
  /** Fotos legíveis consideradas. */
  readonly readable: number;
  /** Fotos descartadas por ilegibilidade (eixo separado — L1). */
  readonly unreadable: number;
  /** Instante da foto legível mais recente. */
  readonly lastObservedAt: number | null;
}

/** L7 — recência decrescente, desempate estável por id. */
function byRecency(a: ReconcileSnapshotReading, b: ReconcileSnapshotReading): number {
  const at = a.observedAt ?? Number.NEGATIVE_INFINITY;
  const bt = b.observedAt ?? Number.NEGATIVE_INFINITY;
  if (at !== bt) return bt - at;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/**
 * L2–L6 — classifica uma série já ordenada do **mais antigo ao mais recente**.
 * Exposta separadamente porque é exatamente o que o espelho SQL recebe.
 */
export function classifyOrphanSeries(series: readonly number[]): OrphanTrendVerdict {
  const list = Array.isArray(series) ? series.filter((n) => Number.isInteger(n) && n >= 0) : [];
  if (list.length === 0) return 'no_history';

  const latest = list[list.length - 1] ?? 0;
  // L2 — a foto mais recente governa.
  if (latest === 0) return 'clear';

  // Bloco contíguo com órfão, terminando na foto mais recente.
  let start = list.length - 1;
  while (start - 1 >= 0 && (list[start - 1] ?? 0) > 0) start -= 1;
  const block = list.slice(start);

  // L3 — sem amostra suficiente não se declara padrão.
  if (block.length < PERSIST_SAMPLES) return 'emerging';

  let strictlyUp = true;
  let strictlyDown = true;
  for (let i = 1; i < block.length; i += 1) {
    const prev = block[i - 1] ?? 0;
    const curr = block[i] ?? 0;
    if (curr <= prev) strictlyUp = false;
    if (curr >= prev) strictlyDown = false;
  }

  if (strictlyUp) return 'growing'; // L4
  if (strictlyDown) return 'resolving'; // L5
  return 'persistent'; // L6
}

export interface TrendOptions {
  /** Quantas fotos recentes entram na janela. */
  readonly window?: number;
}

/** L1–L8 — avalia a tendência a partir de leituras já normalizadas. Nunca lança. */
export function assessOrphanTrend(
  readings: readonly ReconcileSnapshotReading[] | null | undefined,
  options: TrendOptions = {}
): OrphanTrendAssessment {
  const windowSize =
    typeof options.window === 'number' && Number.isInteger(options.window) && options.window > 0
      ? options.window
      : DEFAULT_WINDOW;

  const all = Array.isArray(readings) ? readings.filter(Boolean) : [];
  const valid = all
    .filter((r) => r.status === 'valid' && r.observedAt !== null && r.orphan !== null)
    .slice()
    .sort(byRecency);

  const recent = valid.slice(0, windowSize);
  const trend = recent.map((r) => r.orphan ?? 0).reverse();
  const verdict = classifyOrphanSeries(trend);

  let consecutive = 0;
  for (const r of recent) {
    if ((r.orphan ?? 0) > 0) consecutive += 1;
    else break;
  }

  return {
    verdict,
    label: VERDICT_LABEL[verdict],
    orphanNow: recent[0]?.orphan ?? 0,
    consecutive,
    trend,
    readable: valid.length,
    unreadable: all.length - valid.length,
    lastObservedAt: recent[0]?.observedAt ?? null,
  };
}

/** Conveniência: linhas cruas → retrato de tendência. */
export function assessOrphanTrendFromRows(
  raws: readonly RawReconcileSnapshotRow[] | null | undefined,
  options: TrendOptions = {}
): OrphanTrendAssessment {
  const list = Array.isArray(raws) ? raws : [];
  return assessOrphanTrend(
    list.map((raw, i) => readReconcileSnapshot(raw, i)),
    options
  );
}

/** Severidade derivada do veredito. `null` = não emite. */
export function severityForTrend(verdict: OrphanTrendVerdict): 'warning' | 'critical' | null {
  switch (verdict) {
    case 'growing':
    case 'persistent':
      return 'critical';
    case 'emerging':
    case 'resolving':
      return 'warning';
    case 'clear':
    case 'no_history':
      return null;
    default:
      return null;
  }
}

/** Frase em PT-BR — sempre com a série que sustenta o veredito (L8). */
export function renderTrendReason(assessment: OrphanTrendAssessment): string {
  const serie = assessment.trend.join(' → ');
  switch (assessment.verdict) {
    case 'growing':
      return `Órfão do livro de admissão crescente (${serie}) em ${assessment.consecutive} conciliações`;
    case 'persistent':
      return `Órfão do livro de admissão persiste em ${assessment.consecutive} conciliações (${serie})`;
    case 'resolving':
      return `Órfão do livro de admissão em queda (${serie}) — ainda ${assessment.orphanNow} janela(s) sem dono`;
    case 'emerging':
      return `Órfão do livro de admissão recente: ${assessment.orphanNow} janela(s) sem dono, histórico curto (${assessment.readable} foto(s) legível(is))`;
    case 'clear':
      return 'Órfão do livro de admissão zerado na última conciliação';
    default:
      return `Sem histórico legível de conciliação (${assessment.unreadable} foto(s) ilegível(is) descartada(s))`;
  }
}
