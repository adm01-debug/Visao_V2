/**
 * Onda 183 — painel de séries crônicas.
 *
 * As Ondas 179–182 ensinaram o sistema a classificar e a persistir a
 * reincidência de **uma** série. Falta a pergunta que o gestor de manutenção
 * faz de verdade: *quais* séries estão doentes agora, e em que ordem tratá-las.
 *
 * Este módulo é a regra única de montagem desse painel. Ele não consulta o
 * banco nem conhece relógio próprio: recebe as contagens já apuradas pelo
 * servidor (`list_alarm_recurrence_series`) e devolve a lista ordenada,
 * classificada e auditável.
 *
 * Regras invioláveis:
 *
 *  1. **Veredito é um só.** A classe e o modo saem de
 *     `classifyRecurrenceCounts` — a mesma escada usada na avaliação local.
 *     Reimplementar a regra aqui garantiria divergência no primeiro ajuste de
 *     limiar.
 *  2. **Ausência de dado nunca vira saúde.** Série sem carimbo de abertura é
 *     `unknown`, jamais `quiet`. "Não sei" e "está calmo" são estados
 *     diferentes e confundi-los esconde justamente a série cujo registro
 *     falhou.
 *  3. **Aberto nunca fica abaixo de fechado com a mesma pontuação.** O que
 *     está em curso é o que exige ação; o desempate é explícito, não acidental.
 *  4. **Ordem total e determinística.** Todo empate desce até a chave da
 *     série, então a mesma entrada produz sempre a mesma tela — painel que
 *     reordena sozinho a cada atualização é inoperável.
 *  5. **Monotônico no agravamento.** Acrescentar episódio ou oscilação a uma
 *     série nunca reduz sua pontuação nem enfraquece sua classe.
 *  6. **Corte é declarado.** O teto de linhas exibidas devolve `truncated`
 *     com quantas séries ficaram de fora — lista cortada em silêncio mente
 *     sobre o tamanho do problema.
 *  7. **Linha inválida é descartada com motivo contado**, nunca saneada para
 *     um valor plausível: chave vazia ou contagem impossível é sintoma de
 *     defeito a montante e precisa aparecer.
 *  8. **Relógio adiantado não gera idade negativa.** Carimbo no futuro vira
 *     idade zero e é sinalizado (`clockAhead`), nunca invertido.
 *  9. **Puro e determinístico.** Sem rede, sem `Date.now()`, sem mutar a
 *     entrada.
 */

import {
  classifyRecurrenceCounts,
  noticeModeRank,
  recurrenceClassRank,
  resolveRecurrenceConfig,
  type NoticeMode,
  type RecurrenceClass,
  type RecurrenceConfig,
  type RecurrenceSeverity,
} from './alarmRecurrence';

/** Linha crua vinda do servidor (já agregada por série). */
export interface SeriesSummaryRow {
  seriesKey: string;
  episodesInWindow: number;
  chatterInWindow: number;
  totalEpisodes: number;
  peakSeverity: RecurrenceSeverity | null;
  isOpen: boolean;
  /** Epoch ms da última abertura; `null` quando desconhecido (regra 2). */
  lastOpenedAt: number | null;
  /** Epoch ms do último encerramento; `null` se aberto ou desconhecido. */
  lastClosedAt: number | null;
}

/** Estado operacional da série no instante avaliado. */
export type SeriesState = 'open' | 'settling' | 'quiet' | 'unknown';

export type SeriesDiscardReason = 'invalid_row' | 'empty_key' | 'duplicate_key' | 'invalid_counts';

export interface ChronicSeriesEntry {
  seriesKey: string;
  klass: RecurrenceClass;
  mode: NoticeMode;
  state: SeriesState;
  flapping: boolean;
  episodesInWindow: number;
  chatterInWindow: number;
  totalEpisodes: number;
  peakSeverity: RecurrenceSeverity | null;
  isOpen: boolean;
  lastOpenedAt: number | null;
  /** Tempo desde a última abertura; `null` quando desconhecido (regra 2). */
  ageMs: number | null;
  /** Carimbo posterior a `now` — relógio da origem adiantado (regra 8). */
  clockAhead: boolean;
  /** Pontuação de prioridade; monotônica no agravamento (regra 5). */
  score: number;
}

export interface ChronicSeriesBoard {
  entries: readonly ChronicSeriesEntry[];
  /** Séries válidas que não couberam no teto de exibição (regra 6). */
  truncated: number;
  /** Total de séries válidas consideradas. */
  totalSeries: number;
  chronicCount: number;
  recurrentCount: number;
  flappingCount: number;
  openCount: number;
  unknownCount: number;
  /** Descartes por motivo, sempre presentes com zero (regra 7). */
  discarded: Readonly<Record<SeriesDiscardReason, number>>;
  config: RecurrenceConfig;
}

export interface ChronicBoardOptions {
  /** Teto de linhas exibidas. Padrão 25. */
  limit?: number;
  /**
   * Janela de acalmia: série fechada há menos que isso ainda é `settling`.
   * Padrão: a própria janela de reincidência.
   */
  settlingMs?: number;
  recurrence?: Partial<RecurrenceConfig> | null;
}

const DEFAULT_LIMIT = 25;

const SEVERITY_RANK: Readonly<Record<RecurrenceSeverity, number>> = Object.freeze({
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
});

const STATE_RANK: Readonly<Record<SeriesState, number>> = Object.freeze({
  quiet: 0,
  unknown: 1,
  settling: 2,
  open: 3,
});

const isClock = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

const isSeverity = (v: unknown): v is RecurrenceSeverity =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(SEVERITY_RANK, v);

/** Ordem total dos estados — exposta para as verificações de invariante. */
export const seriesStateRank = (s: SeriesState): number => STATE_RANK[s];

const emptyDiscards = (): Record<SeriesDiscardReason, number> => ({
  invalid_row: 0,
  empty_key: 0,
  duplicate_key: 0,
  invalid_counts: 0,
});

/**
 * Pontuação de prioridade.
 *
 * Todos os termos são não decrescentes nas contagens, então acrescentar
 * episódio ou oscilação jamais reduz a posição (regra 5). O estado (aberto,
 * acalmando) fica **fora** da pontuação e atua apenas como desempate (regra
 * 3): assim uma série calma e crônica nunca é empurrada para o fim por uma
 * série aberta e trivial.
 */
const scoreOf = (
  klass: RecurrenceClass,
  mode: NoticeMode,
  severity: RecurrenceSeverity | null,
  episodes: number,
  chatter: number
): number =>
  recurrenceClassRank(klass) * 10_000 +
  noticeModeRank(mode) * 2_000 +
  (severity ? SEVERITY_RANK[severity] : 0) * 400 +
  Math.min(episodes, 99) * 4 +
  Math.min(chatter, 99) * 2;

/**
 * Monta o painel a partir das linhas do servidor.
 *
 * `now` inválido não derruba a tela: as idades ficam desconhecidas (`null`) e
 * o estado cai para `unknown` em vez de fabricar "calmo" (regra 2).
 */
export function buildChronicSeriesBoard(
  rows: readonly SeriesSummaryRow[] | null | undefined,
  now: number,
  options?: ChronicBoardOptions | null
): ChronicSeriesBoard {
  const config = resolveRecurrenceConfig(options?.recurrence);
  const limit =
    Number.isInteger(options?.limit) && (options?.limit ?? 0) > 0
      ? (options?.limit as number)
      : DEFAULT_LIMIT;
  const settlingMs =
    isClock(options?.settlingMs) && (options?.settlingMs as number) >= 0
      ? (options?.settlingMs as number)
      : config.windowMs;

  const discarded = emptyDiscards();
  const seen = new Set<string>();
  const entries: ChronicSeriesEntry[] = [];
  const clockKnown = isClock(now);

  for (const row of rows ?? []) {
    if (!row || typeof row !== 'object') {
      discarded.invalid_row += 1;
      continue;
    }
    const key = typeof row.seriesKey === 'string' ? row.seriesKey.trim() : '';
    if (key.length === 0) {
      discarded.empty_key += 1;
      continue;
    }
    if (seen.has(key)) {
      discarded.duplicate_key += 1;
      continue;
    }
    if (
      !isCount(row.episodesInWindow) ||
      !isCount(row.chatterInWindow) ||
      !isCount(row.totalEpisodes) ||
      row.chatterInWindow > row.episodesInWindow ||
      row.totalEpisodes < row.episodesInWindow
    ) {
      discarded.invalid_counts += 1;
      continue;
    }
    seen.add(key);

    const episodesInWindow = Math.floor(row.episodesInWindow);
    const chatterInWindow = Math.floor(row.chatterInWindow);
    const totalEpisodes = Math.floor(row.totalEpisodes);
    const peakSeverity = isSeverity(row.peakSeverity) ? row.peakSeverity : null;
    const isOpen = row.isOpen === true;

    const verdict = classifyRecurrenceCounts(
      { episodesInWindow, chatterInWindow, peakSeverity },
      config
    );

    const lastOpenedAt = isClock(row.lastOpenedAt) ? row.lastOpenedAt : null;
    const lastClosedAt = isClock(row.lastClosedAt) ? row.lastClosedAt : null;
    const clockAhead = clockKnown && lastOpenedAt !== null && lastOpenedAt > now;
    const ageMs = clockKnown && lastOpenedAt !== null ? Math.max(0, now - lastOpenedAt) : null;

    let state: SeriesState;
    if (isOpen) state = 'open';
    else if (lastOpenedAt === null || !clockKnown) state = 'unknown';
    else if (lastClosedAt !== null && now - lastClosedAt <= settlingMs) state = 'settling';
    else state = 'quiet';

    entries.push({
      seriesKey: key,
      klass: verdict.klass,
      mode: verdict.mode,
      state,
      flapping: verdict.flapping,
      episodesInWindow,
      chatterInWindow,
      totalEpisodes,
      peakSeverity,
      isOpen,
      lastOpenedAt,
      ageMs,
      clockAhead,
      score: scoreOf(verdict.klass, verdict.mode, peakSeverity, episodesInWindow, chatterInWindow),
    });
  }

  entries.sort(compareEntries);

  const totalSeries = entries.length;
  const visible = entries.slice(0, limit);

  return {
    entries: visible,
    truncated: Math.max(0, totalSeries - visible.length),
    totalSeries,
    chronicCount: entries.filter((e) => e.klass === 'chronic').length,
    recurrentCount: entries.filter((e) => e.klass === 'recurrent').length,
    flappingCount: entries.filter((e) => e.flapping).length,
    openCount: entries.filter((e) => e.isOpen).length,
    unknownCount: entries.filter((e) => e.state === 'unknown').length,
    discarded: Object.freeze(discarded),
    config,
  };
}

/**
 * Comparador total (regra 4): pontuação, depois estado (aberto primeiro,
 * regra 3), depois recência conhecida, e por fim a chave. Nenhum par de
 * entradas distintas empata, então a ordem não depende da estabilidade do
 * `sort` do runtime.
 */
export function compareEntries(a: ChronicSeriesEntry, b: ChronicSeriesEntry): number {
  if (a.score !== b.score) return b.score - a.score;
  const sa = STATE_RANK[a.state];
  const sb = STATE_RANK[b.state];
  if (sa !== sb) return sb - sa;
  // Mais recente primeiro; idade desconhecida vai depois da conhecida, pois
  // não há como afirmar que é urgente — mas nunca é removida da lista.
  if (a.ageMs !== b.ageMs) {
    if (a.ageMs === null) return 1;
    if (b.ageMs === null) return -1;
    return a.ageMs - b.ageMs;
  }
  if (a.totalEpisodes !== b.totalEpisodes) return b.totalEpisodes - a.totalEpisodes;
  return a.seriesKey < b.seriesKey ? -1 : a.seriesKey > b.seriesKey ? 1 : 0;
}

export const seriesStateLabel = (s: SeriesState): string => {
  switch (s) {
    case 'open':
      return 'Em curso';
    case 'settling':
      return 'Acalmando';
    case 'quiet':
      return 'Calmo';
    case 'unknown':
      return 'Sem registro';
  }
};

export const seriesDiscardReasonLabel = (r: SeriesDiscardReason): string => {
  switch (r) {
    case 'invalid_row':
      return 'linha malformada';
    case 'empty_key':
      return 'série sem identificador';
    case 'duplicate_key':
      return 'série duplicada';
    case 'invalid_counts':
      return 'contagens inconsistentes';
  }
};

/** Texto curto para leitura do gestor, sem inventar certeza que não existe. */
export function chronicBoardSummary(board: ChronicSeriesBoard): string {
  if (board.totalSeries === 0) return 'Nenhuma série de alarme registrada na janela.';
  const parts = [`${board.totalSeries} série(s) na janela`];
  if (board.chronicCount > 0) parts.push(`${board.chronicCount} crônica(s)`);
  if (board.recurrentCount > 0) parts.push(`${board.recurrentCount} reincidente(s)`);
  if (board.flappingCount > 0) parts.push(`${board.flappingCount} oscilando`);
  if (board.openCount > 0) parts.push(`${board.openCount} em curso`);
  if (board.unknownCount > 0) parts.push(`${board.unknownCount} sem registro de abertura`);
  if (board.truncated > 0) parts.push(`${board.truncated} fora da lista`);
  return `${parts.join(' · ')}.`;
}
