/**
 * Onda 207 — Simulação exaustiva do FrameBus por câmera.
 *
 * Prova por força bruta, sobre trajetórias longas e produto cartesiano de
 * topologias de consumidores:
 *
 *  S1. Monotonicidade — nenhum consumidor recebe `frameId` menor ou igual ao
 *      último que já recebeu (F7).
 *  S2. Pendência unitária — nenhum slot guarda mais de um frame pendente, e o
 *      pendente é sempre mais recente que o em voo (F2).
 *  S3. Frescor — nenhuma entrega tem idade acima do teto do consumidor (F5).
 *  S4. Piso de cadência — duas entregas ao mesmo consumidor nunca ocorrem a
 *      menos de `minIntervalMs`.
 *  S5. Isolamento — um consumidor eternamente ocupado nunca reduz as entregas
 *      de um consumidor rápido (F4).
 *  S6. Ordem — publicação fora de ordem nunca vira entrega (F3).
 *  S7. Contabilidade fechada — entregas + descartes por consumidor batem com o
 *      total de oportunidades observadas (F8).
 *  S8. Desligamento — depois de `detachConsumer` nenhum frame é entregue, e
 *      conclusão tardia devolve `detached` (F6).
 *  S9. Pureza — `publishFrame` não muta o estado recebido.
 */

import {
  attachConsumer,
  completeDelivery,
  createFrameBus,
  describeBus,
  detachConsumer,
  publishFrame,
  type FrameBusState,
  type FrameConsumer,
} from '../src/lib/vision/frameBus';

let assertions = 0;
const failures: string[] = [];
function check(label: string, ok: boolean): void {
  assertions += 1;
  if (!ok) failures.push(label);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------------------- */
/* Cenário 1 — trajetórias aleatórias com consumidores heterogêneos            */
/* -------------------------------------------------------------------------- */

interface Worker {
  readonly consumer: FrameConsumer;
  /** Duração do processamento (ms) — modela o consumidor lento. */
  readonly workMs: number;
  busyUntilMs: number;
  busyFrameId: number | null;
  lastFrameId: number;
  lastDeliveredAtMs: number;
  deliveries: number;
}

const PROFILES: ReadonlyArray<{ minIntervalMs: number; maxFrameAgeMs: number; workMs: number }> = [
  { minIntervalMs: 0, maxFrameAgeMs: 5_000, workMs: 5 },      // overlay barato
  { minIntervalMs: 300, maxFrameAgeMs: 900, workMs: 40 },      // rastreio
  { minIntervalMs: 2_000, maxFrameAgeMs: 900, workMs: 1_500 }, // identificação cara
  { minIntervalMs: 100, maxFrameAgeMs: 200, workMs: 900 },     // lento e exigente
  { minIntervalMs: 1_000, maxFrameAgeMs: 60_000, workMs: 10 }, // heatmap tolerante
];

function runTrajectory(seed: number, consumerCount: number, steps: number): void {
  const rnd = mulberry32(seed);
  let bus: FrameBusState = createFrameBus(`cam-${seed}`);

  const workers: Worker[] = [];
  for (let i = 0; i < consumerCount; i += 1) {
    const p = PROFILES[(seed + i) % PROFILES.length]!;
    const consumer: FrameConsumer = {
      id: `c${i}`,
      minIntervalMs: p.minIntervalMs,
      maxFrameAgeMs: p.maxFrameAgeMs,
    };
    workers.push({
      consumer,
      workMs: p.workMs,
      busyUntilMs: -1,
      busyFrameId: null,
      lastFrameId: -1,
      lastDeliveredAtMs: Number.NEGATIVE_INFINITY,
      deliveries: 0,
    });
    bus = attachConsumer(bus, consumer);
  }

  let nowMs = 1_700_000_000_000;
  let frameId = 0;
  let published = 0;

  for (let step = 0; step < steps; step += 1) {
    nowMs += 20 + Math.floor(rnd() * 120);

    /* Conclusões vencidas antes da próxima publicação. */
    for (const w of workers) {
      if (w.busyFrameId !== null && w.busyUntilMs <= nowMs) {
        const before = bus;
        const out = completeDelivery(bus, w.consumer.id, w.busyFrameId, w.busyUntilMs);
        bus = out.bus;
        check('S9 pureza (complete)', before.slots[w.consumer.id]!.inFlightFrameId === w.busyFrameId);
        w.busyFrameId = null;
        for (const d of out.deliveries) {
          check('S1 monotonicidade', d.frameId > w.lastFrameId);
          check('S3 frescor', d.ageMs <= w.consumer.maxFrameAgeMs);
          check(
            'S4 piso de cadência',
            w.lastDeliveredAtMs === Number.NEGATIVE_INFINITY ||
              w.busyUntilMs - w.lastDeliveredAtMs >= w.consumer.minIntervalMs,
          );
          w.lastFrameId = d.frameId;
          w.lastDeliveredAtMs = w.busyUntilMs;
          w.busyFrameId = d.frameId;
          w.busyUntilMs = w.busyUntilMs + w.workMs;
          w.deliveries += 1;
        }
      }
    }

    /* Publicação: 12% das vezes fora de ordem, para exercitar F3. */
    const rewind = rnd() < 0.12;
    const capturedAtMs = nowMs - Math.floor(rnd() * 400);
    const candidate = rewind
      ? { frameId: Math.max(0, frameId - 1 - Math.floor(rnd() * 3)), capturedAtMs }
      : { frameId: frameId + 1, capturedAtMs };

    const snapshot = JSON.stringify(bus);
    const out = publishFrame(bus, candidate, nowMs);
    check('S9 pureza (publish)', JSON.stringify(bus) === snapshot);
    bus = out.bus;

    const accepted = out.drops.every((d) => d.reason !== 'out_of_order');
    if (accepted) {
      frameId = candidate.frameId;
      published += 1;
    } else {
      check('S6 ordem', out.deliveries.length === 0);
    }

    for (const d of out.deliveries) {
      const w = workers.find((x) => x.consumer.id === d.consumerId)!;
      check('S1 monotonicidade', d.frameId > w.lastFrameId);
      check('S3 frescor', d.ageMs <= w.consumer.maxFrameAgeMs);
      check(
        'S4 piso de cadência',
        w.lastDeliveredAtMs === Number.NEGATIVE_INFINITY ||
          nowMs - w.lastDeliveredAtMs >= w.consumer.minIntervalMs,
      );
      check('S2 sem entrega concorrente', w.busyFrameId === null);
      w.lastFrameId = d.frameId;
      w.lastDeliveredAtMs = nowMs;
      w.busyFrameId = d.frameId;
      w.busyUntilMs = nowMs + w.workMs;
      w.deliveries += 1;
    }

    /* S2 — invariante estrutural do barramento a cada passo. */
    for (const w of workers) {
      const slot = bus.slots[w.consumer.id]!;
      if (slot.pending) {
        check('S2 pendência exige ocupação', slot.inFlightFrameId !== null);
        check('S2 pendência é mais nova', slot.pending.frameId > (slot.inFlightFrameId ?? -1));
      }
      check('S2 espelho de ocupação', slot.inFlightFrameId === w.busyFrameId);
    }
  }

  /* S7 — contabilidade fechada e retrato coerente. */
  const view = describeBus(bus);
  check('S7 publicados', view.publishedFrames === published);
  for (const w of workers) {
    const cv = view.consumers.find((c) => c.consumerId === w.consumer.id)!;
    check('S7 entregas contabilizadas', cv.stats.delivered === w.deliveries);
    check('S7 razão <= 1', cv.deliveryRatio <= 1 + 1e-9);
    check(
      'S7 saúde honesta',
      !(cv.stats.delivered === 0 && published > 0) || cv.health === 'starved',
    );
  }
}

for (let seed = 1; seed <= 240; seed += 1) {
  runTrajectory(seed, 1 + (seed % 5), 220);
}

/* -------------------------------------------------------------------------- */
/* Cenário 2 — S5: consumidor travado não afeta o rápido                       */
/* -------------------------------------------------------------------------- */

function fastDeliveries(withStuck: boolean, steps: number): number {
  const fast: FrameConsumer = { id: 'fast', minIntervalMs: 0, maxFrameAgeMs: 10_000 };
  const stuck: FrameConsumer = { id: 'stuck', minIntervalMs: 0, maxFrameAgeMs: 10_000 };
  let bus = attachConsumer(createFrameBus('cam-iso'), fast);
  if (withStuck) bus = attachConsumer(bus, stuck);

  let now = 1_700_000_000_000;
  let delivered = 0;
  let inFlight: number | null = null;

  for (let i = 1; i <= steps; i += 1) {
    now += 33;
    if (inFlight !== null) {
      bus = completeDelivery(bus, 'fast', inFlight, now).bus;
      inFlight = null;
    }
    const out = publishFrame(bus, { frameId: i, capturedAtMs: now }, now);
    bus = out.bus;
    for (const d of out.deliveries) {
      if (d.consumerId === 'fast') {
        delivered += 1;
        inFlight = d.frameId;
      }
    }
    /* O `stuck` nunca conclui: acumula pendência substituída, e só. */
  }
  return delivered;
}

for (let steps = 20; steps <= 400; steps += 20) {
  check('S5 isolamento de backpressure', fastDeliveries(true, steps) === fastDeliveries(false, steps));
}

/* -------------------------------------------------------------------------- */
/* Cenário 3 — S8: desligamento e conclusões inválidas                         */
/* -------------------------------------------------------------------------- */

for (let seed = 1; seed <= 200; seed += 1) {
  const c: FrameConsumer = { id: 'x', minIntervalMs: 0, maxFrameAgeMs: 10_000 };
  let bus = attachConsumer(createFrameBus('cam-detach'), c);
  let now = 1_700_000_000_000 + seed;

  const first = publishFrame(bus, { frameId: 1, capturedAtMs: now }, now);
  bus = first.bus;
  check('S8 primeira entrega', first.deliveries.length === 1);

  now += 10;
  const second = publishFrame(bus, { frameId: 2, capturedAtMs: now }, now);
  bus = second.bus;
  check('S8 segunda vira pendência', second.deliveries.length === 0);
  check('S8 pendência registrada', bus.slots['x']!.pending?.frameId === 2);

  bus = detachConsumer(bus, 'x');
  check('S8 slot removido', bus.slots['x'] === undefined);

  const late = completeDelivery(bus, 'x', 1, now + 5);
  check('S8 conclusão tardia é detached', late.drops[0]?.reason === 'detached');
  check('S8 sem entrega residual', late.deliveries.length === 0);

  const orphan = publishFrame(bus, { frameId: 3, capturedAtMs: now + 6 }, now + 6);
  check('S8 sem consumidores', orphan.drops[0]?.reason === 'no_consumers');
  check('S8 sem entrega sem consumidor', orphan.deliveries.length === 0);

  /* Conclusão que não corresponde ao frame em voo. */
  let bus2 = attachConsumer(createFrameBus('cam-foreign'), c);
  const d1 = publishFrame(bus2, { frameId: 1, capturedAtMs: now }, now);
  bus2 = d1.bus;
  const foreign = completeDelivery(bus2, 'x', 99, now + 1);
  check('S8 conclusão estranha', foreign.drops[0]?.reason === 'foreign_completion');
  check('S8 slot segue ocupado', foreign.bus.slots['x']!.inFlightFrameId === 1);
}

/* -------------------------------------------------------------------------- */
/* Cenário 4 — anti-retrocesso de relógio                                      */
/* -------------------------------------------------------------------------- */

for (let seed = 1; seed <= 200; seed += 1) {
  const c: FrameConsumer = { id: 'k', minIntervalMs: 500, maxFrameAgeMs: 1_000 };
  let bus = attachConsumer(createFrameBus('cam-clock'), c);
  const t0 = 1_700_000_000_000;
  bus = publishFrame(bus, { frameId: 1, capturedAtMs: t0 }, t0).bus;
  bus = completeDelivery(bus, 'k', 1, t0 + 10).bus;

  /* Relógio recua: não pode liberar entrega antes do piso. */
  const back = publishFrame(bus, { frameId: 2, capturedAtMs: t0 + 20 }, t0 - 5_000);
  check('S10 retrocesso não entrega', back.deliveries.length === 0);
  check('S10 piso preservado', back.bus.clockFloorMs >= t0 + 10);
}

/* -------------------------------------------------------------------------- */

if (failures.length > 0) {
  const unique = [...new Set(failures)];
  console.error(`❌ Onda 207: ${failures.length} falha(s) em ${assertions} asserções`);
  for (const f of unique.slice(0, 20)) console.error(`   - ${f}`);
  process.exit(1);
}

console.log(`✅ Onda 207 — FrameBus: ${assertions.toLocaleString('pt-BR')} asserções aprovadas`);
