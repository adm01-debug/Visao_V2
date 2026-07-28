/**
 * Onda 208 — Contrato `VisionProcessor` unificado (um ciclo por câmera).
 *
 * As Ondas 206 e 207 entregaram duas réguas independentes:
 *
 *  - `inferenceCadence` decide **o que rodar** (rastreio barato x identificação
 *    cara, sob orçamento e concorrência);
 *  - `frameBus` decide **quem recebe o frame** (fan-out único, latest-wins,
 *    backpressure isolado).
 *
 * Faltava o elo: hoje cada processador de visão (rastreio, face, ALPR, heatmap)
 * é ligado à mão, cada um com o seu jeito de tratar falha, resultado tardio e
 * custo. Sem contrato, um processador que quebra derruba o laço inteiro da
 * câmera, e um resultado que chega atrasado vira overlay fantasma — exatamente
 * o que a Onda 159 proíbe (estado não verificado apresentado como verificado).
 *
 * Este módulo é o contrato e o ciclo. Puro: sem relógio, sem rede, sem
 * `try/catch` de execução real. O chamador executa; aqui se decide a admissão e
 * se registra o desfecho.
 *
 * ## Oito leis que não podem ser revertidas
 *
 * P1. **Barramento antes da cadência.** Nenhum processador é acionado sem que o
 *     frame tenha sido admitido pelo FrameBus. Cadência nunca "fura" o
 *     barramento.
 *
 * P2. **Capacidade declarada é limite absoluto.** Um processador só recebe
 *     tarefa do tipo que declarou (`track` e/ou `identify`). Pedir identificação
 *     a quem só rastreia é erro de composição, não decisão de runtime.
 *
 * P3. **Falha isolada nunca contamina.** O desfecho de um processador não altera
 *     a admissão de nenhum outro no mesmo instante.
 *
 * P4. **Resultado tardio é descartado, nunca aplicado.** Laudo de um `frameId`
 *     que já foi superado pelo processador não vira leitura — só estatística.
 *
 * P5. **Custo é debitado na admissão, jamais no desfecho.** Identificação que
 *     falha não devolve orçamento: a GPU/API já foi paga. O desfecho libera
 *     apenas a concorrência.
 *
 * P6. **Quarentena sai por prova, não por relógio isolado.** Depois de
 *     `failureThreshold` falhas consecutivas o processador é suspenso por
 *     `quarantineMs`; ao voltar, ele volta *em observação* e um único sucesso o
 *     reabilita — um único fracasso o suspende de novo. Nunca há reabilitação
 *     silenciosa por simples passagem do tempo.
 *
 * P7. **Ordem determinística.** O fan-out segue a ordem de registro, sempre.
 *
 * P8. **Todo desfecho é fato contabilizado.** Sucesso, falha, tardio e recusa
 *     têm contador próprio. Perder execução sem registrar é o mesmo erro
 *     probatório vetado na Onda 207 (F8).
 */

import {
  DEFAULT_CADENCE,
  commitDecision,
  createCadenceState,
  decideCadence,
  releaseIdentify,
  type CadenceConfig,
  type CadenceDecision,
  type CadenceState,
  type FrameObservation,
} from './inferenceCadence';
import {
  attachConsumer,
  completeDelivery,
  createFrameBus,
  publishFrame,
  type BusFrame,
  type FrameBusState,
  type FrameDrop,
} from './frameBus';

/* ========================================================================== */
/* Contrato                                                                    */
/* ========================================================================== */

/** Tipo de trabalho que um processador sabe executar. */
export type ProcessorCapability = 'track' | 'identify';

/**
 * Declaração de um processador de visão. É só declaração: a execução vive fora
 * daqui, porque este módulo precisa permanecer puro e testável por força bruta.
 */
export interface VisionProcessor {
  readonly id: string;
  /** O que ele sabe fazer (P2). Vazio seria um processador inútil. */
  readonly capabilities: readonly ProcessorCapability[];
  /** Piso entre duas entregas de frame a este processador. */
  readonly minIntervalMs: number;
  /** Idade máxima de frame que ele aceita. */
  readonly maxFrameAgeMs: number;
  /** Falhas consecutivas que disparam quarentena (P6). */
  readonly failureThreshold: number;
  /** Duração da suspensão. */
  readonly quarantineMs: number;
}

export const DEFAULT_PROCESSOR: Omit<VisionProcessor, 'id' | 'capabilities'> = {
  minIntervalMs: 0,
  maxFrameAgeMs: 900,
  failureThreshold: 3,
  quarantineMs: 30_000,
};

/** Estado de confiança do processador. `probation` é a volta da quarentena. */
export type ProcessorHealth = 'healthy' | 'degraded' | 'quarantined' | 'probation';

export interface ProcessorStats {
  readonly admitted: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly late: number;
  readonly refused: number;
}

export interface ProcessorRuntime {
  readonly processor: VisionProcessor;
  readonly health: ProcessorHealth;
  readonly consecutiveFailures: number;
  /** Instante em que a quarentena termina. `null` = não suspenso. */
  readonly quarantineUntilMs: number | null;
  /** `frameId` da tarefa admitida mais recente — árbitro do laudo tardio (P4). */
  readonly lastAdmittedFrameId: number | null;
  readonly stats: ProcessorStats;
}

export interface PipelineState {
  readonly cameraId: string;
  readonly bus: FrameBusState;
  readonly cadence: CadenceState;
  readonly config: CadenceConfig;
  readonly runtimes: Readonly<Record<string, ProcessorRuntime>>;
  readonly order: readonly string[];
  readonly clockFloorMs: number;
}

/** Tarefa que o chamador deve executar de fato. */
export interface PipelineTask {
  readonly processorId: string;
  readonly kind: ProcessorCapability;
  readonly frameId: number;
  readonly capturedAtMs: number;
  readonly trackId: string | null;
}

export type RefusalReason =
  | 'quarantined'
  | 'capability_missing'
  | 'cadence_skip'
  | 'cadence_downgrade';

export interface PipelineRefusal {
  readonly processorId: string;
  readonly kind: ProcessorCapability;
  readonly reason: RefusalReason;
  readonly frameId: number;
}

export interface PipelineTick {
  readonly state: PipelineState;
  readonly tasks: readonly PipelineTask[];
  readonly refusals: readonly PipelineRefusal[];
  readonly busDrops: readonly FrameDrop[];
  readonly decision: CadenceDecision | null;
}

const ZERO_STATS: ProcessorStats = {
  admitted: 0,
  succeeded: 0,
  failed: 0,
  late: 0,
  refused: 0,
};

/* ========================================================================== */
/* Construção                                                                  */
/* ========================================================================== */

export function createPipeline(
  cameraId: string,
  config: CadenceConfig = DEFAULT_CADENCE,
): PipelineState {
  return {
    cameraId,
    bus: createFrameBus(cameraId),
    cadence: createCadenceState(),
    config,
    runtimes: {},
    order: [],
    clockFloorMs: Number.NEGATIVE_INFINITY,
  };
}

/** Registra um processador. Reregistrar preserva contadores e saúde (P8). */
export function registerProcessor(
  state: PipelineState,
  processor: VisionProcessor,
): PipelineState {
  const previous = state.runtimes[processor.id];
  const runtime: ProcessorRuntime = {
    processor,
    health: previous?.health ?? 'healthy',
    consecutiveFailures: previous?.consecutiveFailures ?? 0,
    quarantineUntilMs: previous?.quarantineUntilMs ?? null,
    lastAdmittedFrameId: previous?.lastAdmittedFrameId ?? null,
    stats: previous?.stats ?? ZERO_STATS,
  };
  return {
    ...state,
    bus: attachConsumer(state.bus, {
      id: processor.id,
      minIntervalMs: processor.minIntervalMs,
      maxFrameAgeMs: processor.maxFrameAgeMs,
    }),
    runtimes: { ...state.runtimes, [processor.id]: runtime },
    order: previous ? state.order : [...state.order, processor.id],
  };
}

/* ========================================================================== */
/* Ciclo                                                                       */
/* ========================================================================== */

function bump(
  stats: ProcessorStats,
  field: keyof ProcessorStats,
): ProcessorStats {
  return { ...stats, [field]: stats[field] + 1 };
}

/** P6 — a quarentena vence pelo relógio, mas devolve `probation`, não alta. */
function thawIfDue(runtime: ProcessorRuntime, nowMs: number): ProcessorRuntime {
  if (runtime.health !== 'quarantined') return runtime;
  if (runtime.quarantineUntilMs !== null && nowMs < runtime.quarantineUntilMs) {
    return runtime;
  }
  return { ...runtime, health: 'probation', quarantineUntilMs: null };
}

/**
 * Onda 208-B — devolve o slot do barramento até ele ficar realmente ocioso.
 *
 * `completeDelivery` promove a pendência assim que o slot vaga. Quando quem
 * está sendo liberado é um processador que NÃO vai executar nada (recusado
 * pela cadência, suspenso, ou sem capacidade de rastreio), essa promoção
 * criaria uma entrega órfã: o barramento marca o frame em voo, ninguém executa,
 * e o processador fica mudo para sempre. A simulação de vídeo maltratado achou
 * exatamente esse buraco.
 *
 * Promover a pendência a tarefa aqui seria pior: furaria P1, entregando
 * trabalho sem passar pela cadência. Então drenamos — e cada devolução é um
 * descarte declarado (`consumer_refused`), nunca um sumiço silencioso (P8).
 */
function drainConsumer(
  bus: FrameBusState,
  consumerId: string,
  frameId: number,
  nowMs: number,
): { bus: FrameBusState; drops: FrameDrop[] } {
  let current = bus;
  const drops: FrameDrop[] = [];
  let target = frameId;

  /* A pendência é unitária (F2), então uma volta basta; o teto existe só para
   * que nenhuma mudança futura no barramento transforme isto em laço infinito. */
  for (let guard = 0; guard < 4; guard += 1) {
    const released = completeDelivery(current, consumerId, target, nowMs);
    current = released.bus;
    drops.push(...released.drops);
    const promoted = released.deliveries[0];
    if (!promoted) break;
    drops.push({ consumerId, frameId: promoted.frameId, reason: 'consumer_refused' });
    target = promoted.frameId;
  }

  return { bus: current, drops };
}



/**
 * Um tick do ciclo da câmera: publica o frame, colhe as entregas do barramento
 * e converte cada entrega em tarefa, sob a régua de cadência.
 */
export function tickPipeline(
  state: PipelineState,
  frame: BusFrame,
  observation: FrameObservation,
  nowMs: number,
): PipelineTick {
  const effectiveNowMs = Math.max(nowMs, state.clockFloorMs);

  /* P1 — barramento primeiro, sempre. */
  const published = publishFrame(state.bus, frame, effectiveNowMs);

  /* Uma decisão de cadência por frame admitido: a câmera é a unidade de custo,
   * não o processador. Dois processadores caros no mesmo frame competem pelo
   * mesmo orçamento — é isso que a Onda 206 protege. */
  const admittedByBus = published.deliveries.length > 0;
  const decision = admittedByBus
    ? decideCadence(state.cadence, observation, effectiveNowMs, state.config)
    : null;

  const runtimes: Record<string, ProcessorRuntime> = { ...state.runtimes };
  const tasks: PipelineTask[] = [];
  const refusals: PipelineRefusal[] = [];
  let identifyClaimed = false;

  /* P7 — ordem de registro, nunca `Object.keys`. */
  for (const id of state.order) {
    const delivered = published.deliveries.find((d) => d.consumerId === id);
    if (!delivered || !decision) continue;

    const runtime = thawIfDue(runtimes[id]!, effectiveNowMs);
    runtimes[id] = runtime;
    const wants = runtime.processor.capabilities;

    /* P6 — suspenso não recebe tarefa, mas o frame já foi entregue pelo
     * barramento; o chamador simplesmente o descarta ao ver a recusa. */
    if (runtime.health === 'quarantined') {
      const kind: ProcessorCapability = wants.includes('identify')
        ? 'identify'
        : 'track';
      refusals.push({ processorId: id, kind, reason: 'quarantined', frameId: frame.frameId });
      runtimes[id] = { ...runtime, stats: bump(runtime.stats, 'refused') };
      continue;
    }

    if (decision.action === 'skip') {
      const kind: ProcessorCapability = wants.includes('track') ? 'track' : 'identify';
      refusals.push({ processorId: id, kind, reason: 'cadence_skip', frameId: frame.frameId });
      runtimes[id] = { ...runtime, stats: bump(runtime.stats, 'refused') };
      continue;
    }

    /* P2 — capacidade declarada manda. A identificação autorizada pela cadência
     * é UMA por frame (o orçamento foi debitado uma vez); o primeiro
     * processador capaz na ordem de registro a recebe. */
    if (decision.action === 'identify' && wants.includes('identify') && !identifyClaimed) {
      identifyClaimed = true;
      tasks.push({
        processorId: id,
        kind: 'identify',
        frameId: frame.frameId,
        capturedAtMs: frame.capturedAtMs,
        trackId: decision.trackId,
      });
      runtimes[id] = {
        ...runtime,
        lastAdmittedFrameId: frame.frameId,
        stats: bump(runtime.stats, 'admitted'),
      };
      continue;
    }

    if (wants.includes('track')) {
      tasks.push({
        processorId: id,
        kind: 'track',
        frameId: frame.frameId,
        capturedAtMs: frame.capturedAtMs,
        trackId: null,
      });
      runtimes[id] = {
        ...runtime,
        lastAdmittedFrameId: frame.frameId,
        stats: bump(runtime.stats, 'admitted'),
      };
      continue;
    }

    /* Só sabe identificar, e a cadência não autorizou identificação agora. */
    refusals.push({
      processorId: id,
      kind: 'identify',
      reason: decision.action === 'track' ? 'cadence_downgrade' : 'capability_missing',
      frameId: frame.frameId,
    });
    runtimes[id] = { ...runtime, stats: bump(runtime.stats, 'refused') };
  }

  /* P5 — o custo é debitado aqui, na admissão. Se nenhum processador capaz
   * assumiu a identificação, ela nunca aconteceu e não pode ser cobrada:
   * rebaixa-se a decisão a `track` antes de escrever no livro de custo. */
  let cadence = state.cadence;
  if (decision) {
    const effective: CadenceDecision =
      decision.action === 'identify' && !identifyClaimed
        ? { ...decision, action: 'track', trackId: null }
        : decision;
    cadence = commitDecision(state.cadence, effective, state.config);
  }

  /* P3/P8 — recusa NÃO pode deixar o slot do barramento ocupado. O FrameBus
   * marca o consumidor em voo no instante da entrega; se o ciclo recusou, nunca
   * haverá `settleTask` para dar baixa e o processador ficaria mudo para sempre
   * (gap achado pela simulação da Onda 208, cenário de quarentena). Liberamos
   * aqui, no mesmo tick, e o descarte fica contabilizado. */
  let bus = published.bus;
  const drops = [...published.drops];
  for (const refusal of refusals) {
    const drained = drainConsumer(bus, refusal.processorId, refusal.frameId, effectiveNowMs);
    bus = drained.bus;
    drops.push(...drained.drops);
  }


  return {
    state: {
      ...state,
      bus,
      cadence,
      runtimes,
      clockFloorMs: effectiveNowMs,
    },
    tasks,
    refusals,
    busDrops: drops,
    decision,
  };
}

/* ========================================================================== */
/* Desfecho                                                                    */
/* ========================================================================== */

export type TaskOutcome = 'success' | 'failure';

export interface SettleResult {
  readonly state: PipelineState;
  /** Tarefas liberadas da pendência do barramento após esta baixa. */
  readonly tasks: readonly PipelineTask[];
  /** `true` quando o laudo chegou tarde e foi descartado (P4). */
  readonly late: boolean;
  /** Descartes do barramento provocados por esta baixa (P8). */
  readonly busDrops: readonly FrameDrop[];
}

/**
 * Registra o desfecho de uma tarefa executada. Libera o slot do barramento e a
 * concorrência de identificação — nunca o orçamento (P5).
 */
export function settleTask(
  state: PipelineState,
  task: PipelineTask,
  outcome: TaskOutcome,
  nowMs: number,
): SettleResult {
  const effectiveNowMs = Math.max(nowMs, state.clockFloorMs);
  const runtime = state.runtimes[task.processorId];
  if (!runtime) {
    return {
      state: { ...state, clockFloorMs: effectiveNowMs },
      tasks: [],
      busDrops: [],
      late: false,
    };
  }

  /* P4 — laudo de frame já superado é estatística, não leitura. */
  const late =
    runtime.lastAdmittedFrameId !== null &&
    task.frameId < runtime.lastAdmittedFrameId;

  let next: ProcessorRuntime;
  if (late) {
    next = { ...runtime, stats: bump(runtime.stats, 'late') };
  } else if (outcome === 'success') {
    next = {
      ...runtime,
      health: 'healthy',
      consecutiveFailures: 0,
      quarantineUntilMs: null,
      stats: bump(runtime.stats, 'succeeded'),
    };
  } else {
    const consecutiveFailures = runtime.consecutiveFailures + 1;
    /* P6 — em observação, um único fracasso volta a suspender. */
    const suspend =
      runtime.health === 'probation' ||
      consecutiveFailures >= runtime.processor.failureThreshold;
    next = {
      ...runtime,
      consecutiveFailures,
      health: suspend ? 'quarantined' : 'degraded',
      quarantineUntilMs: suspend
        ? effectiveNowMs + runtime.processor.quarantineMs
        : null,
      stats: bump(runtime.stats, 'failed'),
    };
  }

  /* P5 — a concorrência é devolvida em qualquer desfecho; o orçamento, nunca. */
  const cadence =
    task.kind === 'identify' ? releaseIdentify(state.cadence) : state.cadence;

  const released = completeDelivery(
    state.bus,
    task.processorId,
    task.frameId,
    effectiveNowMs,
  );

  /* Frame que estava pendente e agora foi entregue vira tarefa de rastreio: o
   * pipeline nunca promove pendência a identificação sem passar pela cadência
   * do próximo tick — promover aqui furaria P1 e o orçamento. */
  const canWork =
    next.health !== 'quarantined' && next.processor.capabilities.includes('track');

  let bus = released.bus;
  const drops: FrameDrop[] = [...released.drops];
  let tasks: PipelineTask[] = [];

  if (canWork) {
    tasks = released.deliveries.map((d) => ({
      processorId: task.processorId,
      kind: 'track' as const,
      frameId: d.frameId,
      capturedAtMs: d.capturedAtMs,
      trackId: null,
    }));
  } else {
    /* Onda 208-B — o processador não vai executar: a pendência promovida seria
     * entrega órfã (slot em voo sem tarefa). Drena e contabiliza. */
    for (const delivery of released.deliveries) {
      drops.push({
        consumerId: task.processorId,
        frameId: delivery.frameId,
        reason: 'consumer_refused',
      });
      const drained = drainConsumer(
        bus,
        task.processorId,
        delivery.frameId,
        effectiveNowMs,
      );
      bus = drained.bus;
      drops.push(...drained.drops);
    }
  }

  const withAdmission: ProcessorRuntime =
    tasks.length > 0
      ? {
          ...next,
          lastAdmittedFrameId: tasks[0]!.frameId,
          stats: bump(next.stats, 'admitted'),
        }
      : next;

  return {
    state: {
      ...state,
      bus,
      cadence,
      runtimes: { ...state.runtimes, [task.processorId]: withAdmission },
      clockFloorMs: effectiveNowMs,
    },
    tasks,
    busDrops: drops,
    late,
  };
}


/* ========================================================================== */
/* Leitura para a UI                                                           */
/* ========================================================================== */

export interface ProcessorView {
  readonly processorId: string;
  readonly capabilities: readonly ProcessorCapability[];
  readonly health: ProcessorHealth;
  readonly stats: ProcessorStats;
  /** Sucessos sobre desfechos conclusivos. `null` quando não houve desfecho. */
  readonly successRatio: number | null;
}

export interface PipelineView {
  readonly cameraId: string;
  readonly processors: readonly ProcessorView[];
  /** Há ao menos um processador suspenso ou em observação? */
  readonly degraded: boolean;
}

export function describePipeline(state: PipelineState): PipelineView {
  const processors = state.order
    .map((id) => state.runtimes[id])
    .filter((r): r is ProcessorRuntime => r !== undefined)
    .map((r): ProcessorView => {
      const settled = r.stats.succeeded + r.stats.failed;
      return {
        processorId: r.processor.id,
        capabilities: r.processor.capabilities,
        health: r.health,
        stats: r.stats,
        successRatio: settled === 0 ? null : r.stats.succeeded / settled,
      };
    });

  return {
    cameraId: state.cameraId,
    processors,
    degraded: processors.some(
      (p) => p.health === 'quarantined' || p.health === 'probation',
    ),
  };
}
