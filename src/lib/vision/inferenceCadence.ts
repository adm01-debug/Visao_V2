/**
 * Onda 206 — Gate de custo da inferência (duas cadências, um orçamento).
 *
 * O teardown do `GetStream/Vision-Agents` (docs/analysis/vision-agents-teardown.md)
 * apontou o padrão de **cadência dupla**: rastreio barato em alta frequência
 * (~0,3 s) e identificação cara em baixa frequência (~2 s). No VISÃO, hoje, o
 * mosaico de 16 câmeras dispara o pipeline caro na mesma taxa do barato — o que
 * queima orçamento de GPU/API e, pior, produz rajada de leituras redundantes
 * que a Onda 205 é obrigada a tratar como *uma única testemunha repetida*.
 *
 * Este módulo é a régua única do gate. Puro: sem relógio próprio, sem rede, sem
 * temporizador. Recebe o estado da câmera, o instante e o frame observado, e
 * devolve a decisão. Quem executa é o chamador; quem decide é aqui.
 *
 * ## Sete leis que não podem ser revertidas
 *
 * C1. **Identificar implica rastrear.** Nunca existe identificação sem o
 *     rastreio do mesmo instante. O caro nunca roda "às cegas" sobre um frame
 *     que o barato não olhou — seria afirmar identidade sem posição.
 *
 * C2. **Cadência é piso, nunca teto negociável.** Dois rastreios não ocorrem a
 *     menos de `trackIntervalMs`; uma mesma trilha não é reidentificada antes
 *     de `identifyIntervalMs`. Pedir mais rápido não acelera nada.
 *
 * C3. **Orçamento estrangula o caro, jamais o barato.** Esgotado o teto de
 *     identificações da janela, a decisão degrada para `track` — a câmera
 *     continua enxergando movimento. Cegar o rastreio para economizar seria
 *     trocar custo por perda de evento.
 *
 * C4. **Trilha nunca identificada tem precedência.** Entre reidentificar um
 *     conhecido e identificar um desconhecido, o desconhecido vence sempre. O
 *     valor probatório está na primeira leitura, não na centésima.
 *
 * C5. **Relógio que retrocede nunca libera execução extra.** `now` menor que o
 *     último instante registrado é tratado como o próprio último instante. Um
 *     ajuste de NTP não pode virar licença de gasto (mesma disciplina da Onda
 *     162 para eventos atrasados).
 *
 * C6. **Frame velho é descartado, nunca enfileirado.** Acima de
 *     `maxFrameAgeMs`, a decisão é `skip` com motivo `stale_frame`. Inferir
 *     sobre passado atrasado produz overlay fantasma — o padrão *latest-wins*
 *     do `VideoForwarder`.
 *
 * C7. **O estado só avança com execução aceita.** {@link commitDecision} é a
 *     única porta de escrita, e ela grava exatamente o que foi decidido. Marcar
 *     identificação que não rodou faria o gate se auto-estrangular em silêncio.
 */

/* ========================================================================== */
/* Tipos                                                                       */
/* ========================================================================== */

/** O que o chamador deve executar neste instante. */
export type CadenceAction = 'skip' | 'track' | 'identify';

/** Por que a decisão foi essa. Um motivo por decisão, sempre o dominante. */
export type CadenceReason =
  /* skip */
  | 'stale_frame'
  | 'no_activity'
  | 'track_interval'
  /* track */
  | 'track_due'
  | 'identify_interval'
  | 'budget_exhausted'
  | 'concurrency_saturated'
  /* identify */
  | 'first_sighting'
  | 'identify_due';

export interface CadenceConfig {
  /** Piso entre dois rastreios da mesma câmera. */
  readonly trackIntervalMs: number;
  /** Piso entre duas identificações da mesma trilha. */
  readonly identifyIntervalMs: number;
  /** Idade máxima tolerada do frame (C6). */
  readonly maxFrameAgeMs: number;
  /** Teto de identificações na janela deslizante (C3). */
  readonly identifyBudget: number;
  /** Tamanho da janela deslizante do orçamento. */
  readonly budgetWindowMs: number;
  /** Identificações simultâneas em voo toleradas. */
  readonly maxConcurrentIdentify: number;
}

/** Padrão espelhado do Vision-Agents: 0,3 s rastreio / 2 s identificação. */
export const DEFAULT_CADENCE: CadenceConfig = {
  trackIntervalMs: 300,
  identifyIntervalMs: 2_000,
  maxFrameAgeMs: 900,
  identifyBudget: 30,
  budgetWindowMs: 60_000,
  maxConcurrentIdentify: 2,
};

export interface FrameObservation {
  /** Instante de captura do frame (epoch ms). */
  readonly capturedAtMs: number;
  /** Há atividade digna de rastreio? Sem atividade, nada roda. */
  readonly hasActivity: boolean;
  /**
   * Identificador da trilha candidata a identificação. `null` = nenhuma trilha
   * pede o pipeline caro neste instante.
   */
  readonly trackId: string | null;
  /** A trilha já foi identificada alguma vez? (C4) */
  readonly trackEverIdentified: boolean;
}

export interface CadenceState {
  /** Último instante em que o rastreio rodou. `null` = nunca rodou. */
  readonly lastTrackAtMs: number | null;
  /** Último instante de identificação por trilha. */
  readonly lastIdentifyAtMsByTrack: Readonly<Record<string, number>>;
  /** Instantes das identificações recentes (para a janela de orçamento). */
  readonly recentIdentifyAtMs: readonly number[];
  /** Identificações em voo agora. */
  readonly inFlightIdentify: number;
  /** Maior `now` já observado — guarda anti-retrocesso (C5). */
  readonly clockFloorMs: number;
}

export interface CadenceDecision {
  readonly action: CadenceAction;
  readonly reason: CadenceReason;
  /** Trilha alvo quando `action === 'identify'`. */
  readonly trackId: string | null;
  /** Instante efetivo usado na decisão, já com a guarda de relógio aplicada. */
  readonly effectiveNowMs: number;
  /** Orçamento restante na janela, após a guarda de relógio. */
  readonly budgetRemaining: number;
}

/* ========================================================================== */
/* Estado                                                                      */
/* ========================================================================== */

export function createCadenceState(): CadenceState {
  return {
    lastTrackAtMs: null,
    lastIdentifyAtMsByTrack: {},
    recentIdentifyAtMs: [],
    inFlightIdentify: 0,
    clockFloorMs: Number.NEGATIVE_INFINITY,
  };
}

/** Instantes de identificação ainda dentro da janela deslizante. */
function withinWindow(stamps: readonly number[], nowMs: number, windowMs: number): number[] {
  const cutoff = nowMs - windowMs;
  return stamps.filter((stamp) => stamp > cutoff);
}

/* ========================================================================== */
/* Decisão                                                                     */
/* ========================================================================== */

/**
 * Decide o que executar. Função pura: mesmo `(state, frame, now, config)`
 * devolve sempre a mesma decisão, e nada é escrito.
 */
export function decideCadence(
  state: CadenceState,
  frame: FrameObservation,
  nowMs: number,
  config: CadenceConfig = DEFAULT_CADENCE
): CadenceDecision {
  /* C5 — relógio nunca retrocede para liberar gasto. */
  const effectiveNowMs = Math.max(nowMs, state.clockFloorMs);

  const live = withinWindow(state.recentIdentifyAtMs, effectiveNowMs, config.budgetWindowMs);
  const budgetRemaining = Math.max(0, config.identifyBudget - live.length);

  const base = { trackId: null, effectiveNowMs, budgetRemaining } as const;

  /* C6 — frame velho não vira inferência. */
  const age = effectiveNowMs - frame.capturedAtMs;
  if (age > config.maxFrameAgeMs) {
    return { action: 'skip', reason: 'stale_frame', ...base };
  }

  if (!frame.hasActivity) {
    return { action: 'skip', reason: 'no_activity', ...base };
  }

  /* C2 — piso de cadência do rastreio. */
  const sinceTrack =
    state.lastTrackAtMs === null ? Number.POSITIVE_INFINITY : effectiveNowMs - state.lastTrackAtMs;
  if (sinceTrack < config.trackIntervalMs) {
    return { action: 'skip', reason: 'track_interval', ...base };
  }

  /* A partir daqui o rastreio está liberado. A identificação é um acréscimo
   * (C1: identificar implica rastrear), nunca uma alternativa. */
  const trackOnly = (reason: CadenceReason): CadenceDecision => ({
    action: 'track',
    reason,
    ...base,
  });

  if (frame.trackId === null) return trackOnly('track_due');

  const lastIdentify = state.lastIdentifyAtMsByTrack[frame.trackId];
  const sinceIdentify =
    lastIdentify === undefined ? Number.POSITIVE_INFINITY : effectiveNowMs - lastIdentify;

  /* C4 — primeira leitura da trilha ignora o intervalo, mas nunca o orçamento
   * nem a concorrência: precedência não é licença de estouro. */
  const firstSighting = !frame.trackEverIdentified && lastIdentify === undefined;

  if (!firstSighting && sinceIdentify < config.identifyIntervalMs) {
    return trackOnly('identify_interval');
  }

  /* C3 — orçamento estrangula o caro, o barato segue. */
  if (budgetRemaining <= 0) return trackOnly('budget_exhausted');
  if (state.inFlightIdentify >= config.maxConcurrentIdentify) {
    return trackOnly('concurrency_saturated');
  }

  return {
    action: 'identify',
    reason: firstSighting ? 'first_sighting' : 'identify_due',
    trackId: frame.trackId,
    effectiveNowMs,
    budgetRemaining,
  };
}

/* ========================================================================== */
/* Escrita                                                                     */
/* ========================================================================== */

/**
 * C7 — única porta de escrita. Registra exatamente o que a decisão autorizou.
 * `skip` só move o piso do relógio; `identify` também registra o rastreio, por
 * C1.
 */
export function commitDecision(
  state: CadenceState,
  decision: CadenceDecision,
  config: CadenceConfig = DEFAULT_CADENCE
): CadenceState {
  const now = decision.effectiveNowMs;
  const clockFloorMs = Math.max(state.clockFloorMs, now);

  if (decision.action === 'skip') {
    return { ...state, clockFloorMs };
  }

  const tracked: CadenceState = {
    ...state,
    clockFloorMs,
    lastTrackAtMs: now,
  };

  if (decision.action === 'track') return tracked;

  const trackId = decision.trackId;
  /* Decisão `identify` sem trilha é impossível por construção; a guarda existe
   * para que um chamador que fabrique a decisão à mão não corrompa o livro. */
  if (trackId === null) return tracked;

  return {
    ...tracked,
    lastIdentifyAtMsByTrack: {
      ...tracked.lastIdentifyAtMsByTrack,
      [trackId]: now,
    },
    recentIdentifyAtMs: [
      ...withinWindow(tracked.recentIdentifyAtMs, now, config.budgetWindowMs),
      now,
    ],
    inFlightIdentify: tracked.inFlightIdentify + 1,
  };
}

/** Baixa de uma identificação concluída (sucesso ou falha — o custo já foi). */
export function releaseIdentify(state: CadenceState): CadenceState {
  return {
    ...state,
    inFlightIdentify: Math.max(0, state.inFlightIdentify - 1),
  };
}

/* ========================================================================== */
/* Leitura para a UI                                                           */
/* ========================================================================== */

export interface CadenceBudgetView {
  readonly used: number;
  readonly total: number;
  readonly remaining: number;
  /** `healthy` < 70% | `tight` < 100% | `exhausted` no teto. */
  readonly pressure: 'healthy' | 'tight' | 'exhausted';
}

export function describeBudget(
  state: CadenceState,
  nowMs: number,
  config: CadenceConfig = DEFAULT_CADENCE
): CadenceBudgetView {
  const effectiveNowMs = Math.max(nowMs, state.clockFloorMs);
  const used = withinWindow(state.recentIdentifyAtMs, effectiveNowMs, config.budgetWindowMs).length;
  const total = config.identifyBudget;
  const remaining = Math.max(0, total - used);
  const ratio = total <= 0 ? 1 : used / total;
  const pressure = remaining <= 0 ? 'exhausted' : ratio >= 0.7 ? 'tight' : 'healthy';
  return { used, total, remaining, pressure };
}
