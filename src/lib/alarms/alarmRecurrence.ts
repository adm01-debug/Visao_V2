/**
 * Onda 179 — reincidência de alarme e supressão de oscilação (chattering).
 *
 * A Onda 178 resolveu *quando* um episódio abre e fecha. Falta o problema que
 * derruba mesa de CFTV real: a **repetição**. Um contato solto, um cabo mal
 * crimpado ou uma câmera piscando geram dezenas de episódios legítimos por
 * hora. Cada um, isolado, está correto; juntos, afogam o operador e escondem
 * o alarme que importa.
 *
 * Este módulo é a regra única de reincidência. Ele não abre nem fecha
 * episódio (isso é da agregação) — ele lê o histórico de episódios de uma
 * mesma chave (regra + origem) e responde duas perguntas:
 *
 *   • Qual é a **classe** de reincidência? (`isolated` / `recurrent` / `chronic`)
 *   • Como esse episódio deve ser **apresentado**? (`notify` / `summarize` /
 *     `escalate`)
 *
 * Regras invioláveis:
 *
 *  1. **Resumir nunca é silenciar.** `summarize` significa "um aviso no lugar
 *     de N", jamais "nenhum aviso". Não existe modo que suprima o alarme.
 *  2. **Crítico nunca é resumido.** Gravidade crítica sempre notifica
 *     individualmente; reincidência só pode *aumentar* a resposta
 *     (`escalate`), nunca reduzi-la.
 *  3. **Episódio aberto não tem duração.** Duração desconhecida é `null`, não
 *     zero — tratar aberto como instantâneo classificaria alarme em curso
 *     como oscilação e o resumiria. Só episódio **fechado** conta como
 *     chatter.
 *  4. **A janela esquece, o acumulado não.** Episódios saem da janela
 *     deslizante para efeito de classificação, mas `totalEpisodes` nunca
 *     decrementa: o histórico é prova.
 *  5. **Relógio que retrocede não reescreve o passado.** Registro com carimbo
 *     anterior ao último aceito é descartado (`stale`), nunca reordena o
 *     livro.
 *  6. **Classificação é monotônica na janela.** Para um mesmo `now`,
 *     acrescentar episódio jamais rebaixa a classe nem enfraquece o modo.
 *  7. **Memória limitada, verdade preservada.** O livro guarda no máximo
 *     `maxHistory` episódios (mais antigos descartados), mas os contadores
 *     acumulados permanecem íntegros.
 *  8. **Puro e determinístico.** Sem relógio próprio, sem rede; a entrada
 *     nunca é mutada.
 */

export type RecurrenceSeverity = 'low' | 'medium' | 'high' | 'critical';

export type RecurrenceClass = 'isolated' | 'recurrent' | 'chronic';

/** Como o episódio deve chegar ao operador. Nenhum modo suprime (regra 1). */
export type NoticeMode = 'notify' | 'summarize' | 'escalate';

export type RecurrenceIgnoreReason =
  | 'invalid_input'
  | 'already_open'
  | 'not_open'
  | 'stale_record'
  | 'negative_duration';

export interface EpisodeRecord {
  openedAt: number;
  /** `null` enquanto o episódio está em curso (regra 3). */
  closedAt: number | null;
  /** `null` enquanto aberto (regra 3). */
  durationMs: number | null;
  severity: RecurrenceSeverity;
}

export interface RecurrenceLedger {
  /** Chave da série: normalmente `${ruleId}:${sourceId}`. */
  key: string;
  episodes: readonly EpisodeRecord[];
  /** Acumulado histórico — nunca decrementa (regra 4). */
  totalEpisodes: number;
  /** Acumulado de episódios curtos fechados. */
  totalChatter: number;
  /** Último carimbo aceito, para barrar retrocesso (regra 5). */
  lastAcceptedAt: number | null;
  /** Índice do episódio aberto em `episodes`, ou `null`. */
  openIndex: number | null;
}

export interface RecurrenceConfig {
  /** Janela deslizante de avaliação. */
  windowMs: number;
  /** Episódios na janela a partir dos quais a série é reincidente. */
  recurrentThreshold: number;
  /** Episódios na janela a partir dos quais a série é crônica. */
  chronicThreshold: number;
  /** Episódio fechado mais curto que isto é chatter. */
  chatterMaxMs: number;
  /** Chatter na janela a partir do qual a série é considerada oscilante. */
  chatterThreshold: number;
  /** Teto de episódios guardados (regra 7). */
  maxHistory: number;
}

export const DEFAULT_RECURRENCE_CONFIG: Readonly<RecurrenceConfig> = Object.freeze({
  windowMs: 3_600_000,
  recurrentThreshold: 3,
  chronicThreshold: 6,
  chatterMaxMs: 30_000,
  chatterThreshold: 3,
  maxHistory: 200,
});

const SEVERITY_RANK: Readonly<Record<RecurrenceSeverity, number>> = Object.freeze({
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
});

const CLASS_RANK: Readonly<Record<RecurrenceClass, number>> = Object.freeze({
  isolated: 0,
  recurrent: 1,
  chronic: 2,
});

const MODE_RANK: Readonly<Record<NoticeMode, number>> = Object.freeze({
  summarize: 0,
  notify: 1,
  escalate: 2,
});

const isClock = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isSeverity = (v: unknown): v is RecurrenceSeverity =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(SEVERITY_RANK, v);

/** Ordem total das classes — usada nas verificações de monotonicidade. */
export const recurrenceClassRank = (c: RecurrenceClass): number => CLASS_RANK[c];

/** Ordem total dos modos: resumir < notificar < escalar (regra 2). */
export const noticeModeRank = (m: NoticeMode): number => MODE_RANK[m];

export const emptyRecurrenceLedger = (key: string): RecurrenceLedger => ({
  key: typeof key === 'string' ? key : '',
  episodes: [],
  totalEpisodes: 0,
  totalChatter: 0,
  lastAcceptedAt: null,
  openIndex: null,
});

const normalizeConfig = (cfg?: Partial<RecurrenceConfig> | null): RecurrenceConfig => {
  const base = { ...DEFAULT_RECURRENCE_CONFIG, ...(cfg ?? {}) };
  const windowMs = isClock(base.windowMs) && base.windowMs > 0 ? base.windowMs : DEFAULT_RECURRENCE_CONFIG.windowMs;
  const chatterMaxMs =
    isClock(base.chatterMaxMs) && base.chatterMaxMs >= 0
      ? base.chatterMaxMs
      : DEFAULT_RECURRENCE_CONFIG.chatterMaxMs;
  const recurrentThreshold =
    Number.isInteger(base.recurrentThreshold) && base.recurrentThreshold >= 2
      ? base.recurrentThreshold
      : DEFAULT_RECURRENCE_CONFIG.recurrentThreshold;
  // Crônico nunca pode ser mais fácil que reincidente, senão a classificação
  // deixaria de ser uma escada e a regra 6 cairia.
  const chronicRaw =
    Number.isInteger(base.chronicThreshold) && base.chronicThreshold >= 2
      ? base.chronicThreshold
      : DEFAULT_RECURRENCE_CONFIG.chronicThreshold;
  const chronicThreshold = Math.max(chronicRaw, recurrentThreshold + 1);
  const chatterThreshold =
    Number.isInteger(base.chatterThreshold) && base.chatterThreshold >= 1
      ? base.chatterThreshold
      : DEFAULT_RECURRENCE_CONFIG.chatterThreshold;
  const maxHistory =
    Number.isInteger(base.maxHistory) && base.maxHistory >= 1
      ? base.maxHistory
      : DEFAULT_RECURRENCE_CONFIG.maxHistory;
  return { windowMs, recurrentThreshold, chronicThreshold, chatterMaxMs, chatterThreshold, maxHistory };
};

/** Configuração saneada — exposta para a UI mostrar os limiares reais em uso. */
export const resolveRecurrenceConfig = (cfg?: Partial<RecurrenceConfig> | null): RecurrenceConfig =>
  normalizeConfig(cfg);

export interface LedgerMutation {
  ledger: RecurrenceLedger;
  ignored: RecurrenceIgnoreReason | null;
}

const trim = (
  episodes: EpisodeRecord[],
  openIndex: number | null,
  maxHistory: number,
): { episodes: EpisodeRecord[]; openIndex: number | null } => {
  if (episodes.length <= maxHistory) return { episodes, openIndex };
  const drop = episodes.length - maxHistory;
  const kept = episodes.slice(drop);
  let idx = openIndex;
  if (idx !== null) idx = idx - drop >= 0 ? idx - drop : null;
  return { episodes: kept, openIndex: idx };
};

/**
 * Registra a abertura de um episódio.
 *
 * Abrir duas vezes sem fechar é sintoma de dessincronia com a agregação: o
 * segundo registro é ignorado (`already_open`) em vez de criar um episódio
 * fantasma que inflaria a reincidência.
 */
export function openEpisode(
  ledger: RecurrenceLedger,
  input: { at: number; severity: RecurrenceSeverity },
): LedgerMutation {
  if (!input || !isClock(input.at) || !isSeverity(input.severity)) {
    return { ledger, ignored: 'invalid_input' };
  }
  if (ledger.openIndex !== null) return { ledger, ignored: 'already_open' };
  if (ledger.lastAcceptedAt !== null && input.at < ledger.lastAcceptedAt) {
    return { ledger, ignored: 'stale_record' };
  }

  const episodes = [
    ...ledger.episodes,
    { openedAt: input.at, closedAt: null, durationMs: null, severity: input.severity },
  ];
  const { episodes: kept, openIndex } = trim(episodes, episodes.length - 1, DEFAULT_RECURRENCE_CONFIG.maxHistory);

  return {
    ledger: {
      ...ledger,
      episodes: kept,
      openIndex,
      totalEpisodes: ledger.totalEpisodes + 1,
      lastAcceptedAt: input.at,
    },
    ignored: null,
  };
}

/**
 * Registra o encerramento do episódio em curso.
 *
 * Fechamento com carimbo anterior à abertura seria duração negativa — sinal
 * de relógio de equipamento inconsistente. Recusamos (`negative_duration`)
 * em vez de gravar um episódio impossível que contaria como chatter.
 */
export function closeEpisode(
  ledger: RecurrenceLedger,
  input: { at: number },
  cfg?: Partial<RecurrenceConfig> | null,
): LedgerMutation {
  const config = normalizeConfig(cfg);
  if (!input || !isClock(input.at)) return { ledger, ignored: 'invalid_input' };
  if (ledger.openIndex === null) return { ledger, ignored: 'not_open' };
  if (ledger.lastAcceptedAt !== null && input.at < ledger.lastAcceptedAt) {
    return { ledger, ignored: 'stale_record' };
  }

  const open = ledger.episodes[ledger.openIndex];
  if (!open) return { ledger, ignored: 'not_open' };
  const durationMs = input.at - open.openedAt;
  if (durationMs < 0) return { ledger, ignored: 'negative_duration' };

  const episodes = ledger.episodes.slice();
  episodes[ledger.openIndex] = { ...open, closedAt: input.at, durationMs };

  return {
    ledger: {
      ...ledger,
      episodes,
      openIndex: null,
      totalChatter: ledger.totalChatter + (durationMs < config.chatterMaxMs ? 1 : 0),
      lastAcceptedAt: input.at,
    },
    ignored: null,
  };
}

export interface RecurrenceAssessment {
  klass: RecurrenceClass;
  mode: NoticeMode;
  /** Episódios que tocam a janela (abertos contam sempre). */
  episodesInWindow: number;
  /** Episódios fechados curtos dentro da janela. */
  chatterInWindow: number;
  /** Série oscilante: chatter acima do limiar. */
  flapping: boolean;
  /** Pior gravidade observada na janela; `null` se a janela está vazia. */
  peakSeverity: RecurrenceSeverity | null;
  /** Há episódio em curso agora. */
  open: boolean;
  /** Quantos avisos individuais o modo `summarize` está substituindo. */
  collapsedCount: number;
  config: RecurrenceConfig;
}

/**
 * Avalia a série num instante.
 *
 * Um episódio "toca a janela" se ainda estava aberto dentro dela — não basta
 * ter começado dentro. Contar só pela abertura descartaria um alarme longo em
 * curso e faria a série parecer calma justamente enquanto ela está ruim.
 */
export function assessRecurrence(
  ledger: RecurrenceLedger,
  now: number,
  cfg?: Partial<RecurrenceConfig> | null,
): RecurrenceAssessment {
  const config = normalizeConfig(cfg);
  const from = isClock(now) ? now - config.windowMs : Number.NEGATIVE_INFINITY;

  let episodesInWindow = 0;
  let chatterInWindow = 0;
  let peakRank = -1;
  let peakSeverity: RecurrenceSeverity | null = null;

  for (const ep of ledger.episodes) {
    const end = ep.closedAt ?? (isClock(now) ? now : ep.openedAt);
    if (end < from) continue; // saiu inteiramente da janela
    episodesInWindow += 1;
    if (ep.closedAt !== null && ep.durationMs !== null && ep.durationMs < config.chatterMaxMs) {
      chatterInWindow += 1;
    }
    const rank = SEVERITY_RANK[ep.severity];
    if (rank > peakRank) {
      peakRank = rank;
      peakSeverity = ep.severity;
    }
  }

  const flapping = chatterInWindow >= config.chatterThreshold;

  let klass: RecurrenceClass = 'isolated';
  if (episodesInWindow >= config.chronicThreshold) klass = 'chronic';
  else if (episodesInWindow >= config.recurrentThreshold) klass = 'recurrent';
  // Oscilação é sintoma de defeito físico: promove a série mesmo com poucos
  // episódios contados, mas nunca além de reincidente por si só.
  if (flapping && CLASS_RANK[klass] < CLASS_RANK.recurrent) klass = 'recurrent';

  const critical = peakSeverity === 'critical';
  let mode: NoticeMode;
  if (klass === 'chronic') mode = 'escalate';
  else if (klass === 'recurrent' && !critical) mode = 'summarize';
  else mode = 'notify';

  return {
    klass,
    mode,
    episodesInWindow,
    chatterInWindow,
    flapping,
    peakSeverity,
    open: ledger.openIndex !== null,
    collapsedCount: mode === 'summarize' ? Math.max(0, episodesInWindow - 1) : 0,
    config,
  };
}

export const recurrenceClassLabel = (c: RecurrenceClass): string => {
  switch (c) {
    case 'isolated':
      return 'Ocorrência isolada';
    case 'recurrent':
      return 'Reincidente';
    case 'chronic':
      return 'Crônico';
    default:
      return 'Desconhecido';
  }
};

export const noticeModeLabel = (m: NoticeMode): string => {
  switch (m) {
    case 'notify':
      return 'Avisar individualmente';
    case 'summarize':
      return 'Agrupar em um aviso';
    case 'escalate':
      return 'Escalar para supervisão';
    default:
      return 'Desconhecido';
  }
};

export const recurrenceIgnoreReasonLabel = (r: RecurrenceIgnoreReason): string => {
  switch (r) {
    case 'invalid_input':
      return 'Registro inválido';
    case 'already_open':
      return 'Já havia episódio em curso';
    case 'not_open':
      return 'Não havia episódio em curso';
    case 'stale_record':
      return 'Carimbo anterior ao último aceito';
    case 'negative_duration':
      return 'Encerramento antes da abertura';
    default:
      return 'Desconhecido';
  }
};

/** Texto pronto para o operador — a UI nunca recalcula esta frase. */
export function recurrenceSummaryText(a: RecurrenceAssessment): string {
  if (a.episodesInWindow === 0) return 'Sem ocorrências na janela.';
  const minutes = Math.round(a.config.windowMs / 60_000);
  const base = `${a.episodesInWindow} ${a.episodesInWindow === 1 ? 'ocorrência' : 'ocorrências'} em ${minutes} min`;
  if (a.flapping) return `${base} · oscilação detectada (${a.chatterInWindow} muito curtas)`;
  return base;
}
