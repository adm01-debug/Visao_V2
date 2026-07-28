/**
 * Onda 207 — FrameBus por câmera (uma decodificação, muitos consumidores).
 *
 * O teardown do `GetStream/Vision-Agents`
 * (docs/analysis/vision-agents-teardown.md) descreve o `VideoForwarder`: um
 * único assinante do stream que reencaminha o frame mais recente para vários
 * processadores, cada um na sua própria cadência. No VISÃO, hoje, cada consumidor
 * (rastreio, identificação facial, ALPR, heatmap, overlay) puxa e decodifica o
 * seu próprio frame — a mesma câmera é decodificada N vezes, e um consumidor
 * lento arrasta os rápidos junto.
 *
 * Este módulo é a régua única do barramento. Puro: sem relógio próprio, sem
 * `setTimeout`, sem rede, sem canvas. Recebe estado + frame + instante e devolve
 * o estado seguinte junto com as entregas e os descartes. Quem executa é o
 * chamador; quem decide é aqui. Mesma disciplina da Onda 206
 * ({@link ../vision/inferenceCadence}), com a qual este módulo se compõe: o
 * FrameBus decide **quem recebe o frame**; a cadência decide **o que rodar** com
 * ele.
 *
 * ## Oito leis que não podem ser revertidas
 *
 * F1. **Uma publicação, muitos consumidores.** O frame entra uma vez e é
 *     distribuído por fan-out. Consumidor nunca puxa frame por conta própria —
 *     seria decodificar de novo o que já foi decodificado.
 *
 * F2. **Latest-wins: pendência é substituída, nunca enfileirada.** Consumidor
 *     ocupado guarda no máximo UM frame pendente, e sempre o mais recente. Fila
 *     de frames vira dívida que só cresce e produz overlay do passado.
 *
 * F3. **Frame fora de ordem é descartado, nunca reordenado.** `frameId` menor ou
 *     igual ao último publicado, ou captura anterior à última publicada, não
 *     entra no barramento. Reordenar seria inventar uma linha do tempo que a
 *     câmera não produziu (mesma disciplina da Onda 162).
 *
 * F4. **Consumidor lento nunca atrasa o rápido.** O backpressure é isolado por
 *     consumidor: a ocupação de um jamais bloqueia a entrega ao outro.
 *
 * F5. **Frame vencido nunca é entregue.** Cada consumidor declara a sua idade
 *     máxima tolerada; acima dela o frame é descartado como `stale`, tanto na
 *     publicação quanto na hora de liberar a pendência.
 *
 * F6. **Desligar é imediato e sem entrega residual.** Consumidor desligado perde
 *     a pendência na hora, e uma conclusão que chegue depois é registrada como
 *     `detached` — nunca ressuscita a assinatura.
 *
 * F7. **Nenhum frame é entregue duas vezes ao mesmo consumidor.** A entrega só
 *     ocorre para `frameId` estritamente maior que o último entregue.
 *
 * F8. **Descarte é fato registrado, nunca silêncio.** Todo frame que não vira
 *     entrega produz um {@link FrameDrop} com motivo, e os contadores por
 *     consumidor são cumulativos. Perder frame sem contabilizar é o mesmo erro
 *     probatório que a Onda 159 proíbe: ausência de verificação apresentada
 *     como normalidade.
 */

/* ========================================================================== */
/* Tipos                                                                       */
/* ========================================================================== */

/** Frame publicado pelo decodificador único da câmera. */
export interface BusFrame {
  /** Sequência monotônica da câmera. Estritamente crescente por publicação. */
  readonly frameId: number;
  /** Instante de captura (epoch ms). */
  readonly capturedAtMs: number;
}

/** Assinatura declarada por um processador de visão. */
export interface FrameConsumer {
  readonly id: string;
  /** Piso entre duas entregas a este consumidor. */
  readonly minIntervalMs: number;
  /** Idade máxima do frame que este consumidor aceita (F5). */
  readonly maxFrameAgeMs: number;
}

/** Motivo dominante de um descarte. Um por frame/consumidor. */
export type FrameDropReason =
  /* barramento */
  | 'out_of_order'
  | 'no_consumers'
  /* por consumidor */
  | 'stale'
  | 'interval'
  | 'superseded'
  /* entregue pelo barramento, mas sem processador apto a executar (Onda 208-B):
   * o ciclo recusou a tarefa, então a entrega é devolvida em vez de ficar em
   * voo para sempre. */
  | 'consumer_refused'
  /* conclusões inválidas */
  | 'unknown_consumer'
  | 'detached'
  | 'foreign_completion';

export interface FrameDelivery {
  readonly consumerId: string;
  readonly frameId: number;
  readonly capturedAtMs: number;
  /** Idade do frame no instante da entrega. */
  readonly ageMs: number;
  /** `true` quando a entrega saiu da pendência, não da publicação. */
  readonly fromPending: boolean;
}

export interface FrameDrop {
  /** `null` quando o descarte é do barramento inteiro (F3). */
  readonly consumerId: string | null;
  readonly frameId: number;
  readonly reason: FrameDropReason;
}

export interface ConsumerStats {
  readonly delivered: number;
  readonly droppedStale: number;
  readonly droppedInterval: number;
  readonly droppedSuperseded: number;
}

export interface ConsumerSlot {
  readonly consumer: FrameConsumer;
  /** Frame em processamento agora. `null` = ocioso. */
  readonly inFlightFrameId: number | null;
  /** Única pendência tolerada, sempre a mais recente (F2). */
  readonly pending: BusFrame | null;
  readonly lastDeliveredFrameId: number | null;
  readonly lastDeliveredAtMs: number | null;
  readonly stats: ConsumerStats;
}

export interface FrameBusState {
  readonly cameraId: string;
  readonly lastPublishedFrameId: number | null;
  readonly lastPublishedCapturedAtMs: number | null;
  /** Maior `now` já observado — guarda anti-retrocesso, herdada da Onda 206. */
  readonly clockFloorMs: number;
  readonly slots: Readonly<Record<string, ConsumerSlot>>;
  /** Ordem de inscrição. Fan-out determinístico não depende de `Object.keys`. */
  readonly order: readonly string[];
  readonly publishedFrames: number;
  readonly droppedOutOfOrder: number;
}

export interface BusOutcome {
  readonly bus: FrameBusState;
  readonly deliveries: readonly FrameDelivery[];
  readonly drops: readonly FrameDrop[];
}

const ZERO_STATS: ConsumerStats = {
  delivered: 0,
  droppedStale: 0,
  droppedInterval: 0,
  droppedSuperseded: 0,
};

/* ========================================================================== */
/* Construção e assinatura                                                     */
/* ========================================================================== */

export function createFrameBus(cameraId: string): FrameBusState {
  return {
    cameraId,
    lastPublishedFrameId: null,
    lastPublishedCapturedAtMs: null,
    clockFloorMs: Number.NEGATIVE_INFINITY,
    slots: {},
    order: [],
    publishedFrames: 0,
    droppedOutOfOrder: 0,
  };
}

/**
 * Liga um consumidor. Reinscrever o mesmo `id` substitui a declaração e zera a
 * ocupação — mas preserva os contadores, porque histórico de descarte não se
 * apaga por reconfiguração (F8).
 */
export function attachConsumer(
  bus: FrameBusState,
  consumer: FrameConsumer,
): FrameBusState {
  const previous = bus.slots[consumer.id];
  const slot: ConsumerSlot = {
    consumer,
    inFlightFrameId: null,
    pending: null,
    lastDeliveredFrameId: previous?.lastDeliveredFrameId ?? null,
    lastDeliveredAtMs: previous?.lastDeliveredAtMs ?? null,
    stats: previous?.stats ?? ZERO_STATS,
  };
  return {
    ...bus,
    slots: { ...bus.slots, [consumer.id]: slot },
    order: previous ? bus.order : [...bus.order, consumer.id],
  };
}

/** F6 — desliga na hora; a pendência morre junto. */
export function detachConsumer(
  bus: FrameBusState,
  consumerId: string,
): FrameBusState {
  if (!bus.slots[consumerId]) return bus;
  const slots: Record<string, ConsumerSlot> = { ...bus.slots };
  delete slots[consumerId];
  return {
    ...bus,
    slots,
    order: bus.order.filter((id) => id !== consumerId),
  };
}

/* ========================================================================== */
/* Entrega                                                                     */
/* ========================================================================== */

interface SlotOutcome {
  readonly slot: ConsumerSlot;
  readonly delivery: FrameDelivery | null;
  readonly drops: readonly FrameDrop[];
}

function bumpStats(
  stats: ConsumerStats,
  reason: 'stale' | 'interval' | 'superseded',
): ConsumerStats {
  if (reason === 'stale') return { ...stats, droppedStale: stats.droppedStale + 1 };
  if (reason === 'interval')
    return { ...stats, droppedInterval: stats.droppedInterval + 1 };
  return { ...stats, droppedSuperseded: stats.droppedSuperseded + 1 };
}

/**
 * Avalia um frame candidato para um consumidor ocioso. Não trata ocupação: o
 * chamador já garantiu que o slot está livre.
 */
function offerToIdleSlot(
  slot: ConsumerSlot,
  frame: BusFrame,
  nowMs: number,
  fromPending: boolean,
): SlotOutcome {
  const { consumer } = slot;

  /* F7 — nunca duas vezes o mesmo frame. */
  if (
    slot.lastDeliveredFrameId !== null &&
    frame.frameId <= slot.lastDeliveredFrameId
  ) {
    return {
      slot,
      delivery: null,
      drops: [
        { consumerId: consumer.id, frameId: frame.frameId, reason: 'superseded' },
      ],
    };
  }

  /* F5 — vencido não é entregue, nem saindo da pendência. */
  const ageMs = nowMs - frame.capturedAtMs;
  if (ageMs > consumer.maxFrameAgeMs) {
    return {
      slot: { ...slot, stats: bumpStats(slot.stats, 'stale') },
      delivery: null,
      drops: [{ consumerId: consumer.id, frameId: frame.frameId, reason: 'stale' }],
    };
  }

  /* Piso de cadência do consumidor. */
  if (
    slot.lastDeliveredAtMs !== null &&
    nowMs - slot.lastDeliveredAtMs < consumer.minIntervalMs
  ) {
    return {
      slot: { ...slot, stats: bumpStats(slot.stats, 'interval') },
      delivery: null,
      drops: [
        { consumerId: consumer.id, frameId: frame.frameId, reason: 'interval' },
      ],
    };
  }

  return {
    slot: {
      ...slot,
      inFlightFrameId: frame.frameId,
      pending: null,
      lastDeliveredFrameId: frame.frameId,
      lastDeliveredAtMs: nowMs,
      stats: { ...slot.stats, delivered: slot.stats.delivered + 1 },
    },
    delivery: {
      consumerId: consumer.id,
      frameId: frame.frameId,
      capturedAtMs: frame.capturedAtMs,
      ageMs,
      fromPending,
    },
    drops: [],
  };
}

/**
 * Publica um frame no barramento e distribui por fan-out determinístico, na
 * ordem de inscrição.
 */
export function publishFrame(
  bus: FrameBusState,
  frame: BusFrame,
  nowMs: number,
): BusOutcome {
  const effectiveNowMs = Math.max(nowMs, bus.clockFloorMs);

  /* F3 — fora de ordem não entra. Nem `frameId` repetido, nem captura que
   * retrocede: o barramento não reescreve a linha do tempo da câmera. */
  const outOfOrder =
    (bus.lastPublishedFrameId !== null &&
      frame.frameId <= bus.lastPublishedFrameId) ||
    (bus.lastPublishedCapturedAtMs !== null &&
      frame.capturedAtMs < bus.lastPublishedCapturedAtMs);

  if (outOfOrder) {
    return {
      bus: {
        ...bus,
        clockFloorMs: effectiveNowMs,
        droppedOutOfOrder: bus.droppedOutOfOrder + 1,
      },
      deliveries: [],
      drops: [{ consumerId: null, frameId: frame.frameId, reason: 'out_of_order' }],
    };
  }

  const accepted: FrameBusState = {
    ...bus,
    clockFloorMs: effectiveNowMs,
    lastPublishedFrameId: frame.frameId,
    lastPublishedCapturedAtMs: frame.capturedAtMs,
    publishedFrames: bus.publishedFrames + 1,
  };

  if (accepted.order.length === 0) {
    return {
      bus: accepted,
      deliveries: [],
      drops: [{ consumerId: null, frameId: frame.frameId, reason: 'no_consumers' }],
    };
  }

  const slots: Record<string, ConsumerSlot> = { ...accepted.slots };
  const deliveries: FrameDelivery[] = [];
  const drops: FrameDrop[] = [];

  /* F4 — cada slot é avaliado isoladamente; ocupação de um não influencia o
   * outro em nenhum ponto do laço. */
  for (const id of accepted.order) {
    const slot = slots[id];
    if (!slot) continue;

    if (slot.inFlightFrameId !== null) {
      /* F2 — latest-wins: a pendência anterior é descartada, não enfileirada. */
      if (slot.pending) {
        drops.push({
          consumerId: id,
          frameId: slot.pending.frameId,
          reason: 'superseded',
        });
        slots[id] = {
          ...slot,
          pending: frame,
          stats: bumpStats(slot.stats, 'superseded'),
        };
      } else {
        slots[id] = { ...slot, pending: frame };
      }
      continue;
    }

    const outcome = offerToIdleSlot(slot, frame, effectiveNowMs, false);
    slots[id] = outcome.slot;
    if (outcome.delivery) deliveries.push(outcome.delivery);
    drops.push(...outcome.drops);
  }

  return { bus: { ...accepted, slots }, deliveries, drops };
}

/**
 * Baixa uma entrega concluída (sucesso ou falha — o frame já foi consumido) e,
 * se houver pendência, tenta entregá-la imediatamente.
 */
export function completeDelivery(
  bus: FrameBusState,
  consumerId: string,
  frameId: number,
  nowMs: number,
): BusOutcome {
  const effectiveNowMs = Math.max(nowMs, bus.clockFloorMs);
  const base: FrameBusState = { ...bus, clockFloorMs: effectiveNowMs };
  const slot = base.slots[consumerId];

  /* F6 — conclusão de assinatura já desligada nunca reabre nada. */
  if (!slot) {
    return {
      bus: base,
      deliveries: [],
      drops: [{ consumerId, frameId, reason: 'detached' }],
    };
  }

  /* Conclusão que não corresponde ao frame em voo é ruído (entrega abortada,
   * retransmissão tardia). Registrar e ignorar é mais honesto que liberar o
   * slot de um trabalho que ainda está rodando. */
  if (slot.inFlightFrameId === null || slot.inFlightFrameId !== frameId) {
    return {
      bus: base,
      deliveries: [],
      drops: [{ consumerId, frameId, reason: 'foreign_completion' }],
    };
  }

  const idle: ConsumerSlot = { ...slot, inFlightFrameId: null };

  if (!idle.pending) {
    return {
      bus: { ...base, slots: { ...base.slots, [consumerId]: idle } },
      deliveries: [],
      drops: [],
    };
  }

  const pending = idle.pending;
  const outcome = offerToIdleSlot(
    { ...idle, pending: null },
    pending,
    effectiveNowMs,
    true,
  );

  return {
    bus: { ...base, slots: { ...base.slots, [consumerId]: outcome.slot } },
    deliveries: outcome.delivery ? [outcome.delivery] : [],
    drops: outcome.drops,
  };
}

/** Conclusão desconhecida vinda de um consumidor que nunca existiu. */
export function isUnknownConsumer(
  bus: FrameBusState,
  consumerId: string,
): boolean {
  return bus.slots[consumerId] === undefined;
}

/* ========================================================================== */
/* Leitura para a UI                                                           */
/* ========================================================================== */

export type ConsumerHealth = 'idle' | 'flowing' | 'backlogged' | 'starved';

export interface ConsumerView {
  readonly consumerId: string;
  readonly health: ConsumerHealth;
  readonly inFlight: boolean;
  readonly hasPending: boolean;
  readonly stats: ConsumerStats;
  /** Fração de frames publicados que este consumidor efetivamente recebeu. */
  readonly deliveryRatio: number;
}

export interface BusView {
  readonly cameraId: string;
  readonly publishedFrames: number;
  readonly droppedOutOfOrder: number;
  readonly consumers: readonly ConsumerView[];
}

/**
 * Retrato do barramento. `starved` é reservado a quem nunca recebeu nada
 * apesar de haver publicação — estado que nunca é apresentado como saudável.
 */
export function describeBus(bus: FrameBusState): BusView {
  const slots = bus.order
    .map((id) => bus.slots[id])
    .filter((slot): slot is ConsumerSlot => slot !== undefined);

  const consumers = slots.map((slot): ConsumerView => {
    const id = slot.consumer.id;
    const { stats } = slot;
    const deliveryRatio =
      bus.publishedFrames === 0 ? 0 : stats.delivered / bus.publishedFrames;
    const health: ConsumerHealth =
      stats.delivered === 0 && bus.publishedFrames > 0
        ? 'starved'
        : slot.pending !== null
          ? 'backlogged'
          : slot.inFlightFrameId !== null
            ? 'flowing'
            : 'idle';
    return {
      consumerId: id,
      health,
      inFlight: slot.inFlightFrameId !== null,
      hasPending: slot.pending !== null,
      stats,
      deliveryRatio,
    };
  });

  return {
    cameraId: bus.cameraId,
    publishedFrames: bus.publishedFrames,
    droppedOutOfOrder: bus.droppedOutOfOrder,
    consumers,
  };
}
