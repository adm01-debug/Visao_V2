/**
 * Onda 208-B — Simulação de vídeo real: falhas, atrasos e gaps de fluxo.
 *
 * A simulação original (`simulate-wave208.ts`) provou as leis do contrato sob
 * tráfego bem-comportado. Esta cobre o que a rede faz com o vídeo de verdade:
 *
 *  V1. **Determinismo.** Mesma semente ⇒ mesmo estado final, mesma sequência de
 *      tarefas, recusas e descartes. Byte a byte.
 *  V2. **Latest-wins.** Com o processador ocupado, existe no máximo UMA
 *      pendência, sempre o frame mais recente; o intermediário vira
 *      `superseded` contabilizado.
 *  V3. **Fora de ordem nunca entra.** `frameId` repetido/retrocedido ou captura
 *      que anda para trás é `out_of_order` e jamais vira tarefa.
 *  V4. **Gap de vídeo é honesto.** Congelamento longo ⇒ o frame que volta é
 *      velho e é descartado por `stale`; a retomada com frame fresco volta a
 *      produzir tarefa, sem herdar nada do buraco.
 *  V5. **Nenhuma entrega órfã.** Todo frame entregue pelo barramento (slot em
 *      voo) tem uma tarefa correspondente na mão do chamador. Entrega sem
 *      tarefa é um processador mudo para sempre — o pior gap possível.
 *  V6. **Contabilidade de descarte fechada.** Por consumidor:
 *      entregues + stale + interval + superseded + pendência + em voo
 *      = frames aceitos pelo barramento.
 */

import {
  DEFAULT_CADENCE,
  type CadenceConfig,
  type FrameObservation,
} from '../src/lib/vision/inferenceCadence';
import {
  createPipeline,
  registerProcessor,
  settleTask,
  tickPipeline,
  type PipelineState,
  type PipelineTask,
  type VisionProcessor,
} from '../src/lib/vision/visionPipeline';

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

const SHAPES: ReadonlyArray<
  Pick<VisionProcessor, 'capabilities' | 'minIntervalMs' | 'maxFrameAgeMs'>
> = [
  { capabilities: ['track'], minIntervalMs: 0, maxFrameAgeMs: 900 },
  { capabilities: ['identify'], minIntervalMs: 0, maxFrameAgeMs: 900 },
  { capabilities: ['track', 'identify'], minIntervalMs: 0, maxFrameAgeMs: 1_500 },
  { capabilities: ['track'], minIntervalMs: 400, maxFrameAgeMs: 250 },
];

/** Perfil de maltrato do fluxo de vídeo. */
interface StreamProfile {
  readonly name: string;
  /** Probabilidade de reemitir um frame já publicado (duplicata de rede). */
  readonly duplicateRate: number;
  /** Probabilidade de emitir frame com `frameId` retrocedido (reordenação). */
  readonly reorderRate: number;
  /** Probabilidade de um congelamento (gap) e sua duração. */
  readonly freezeRate: number;
  readonly freezeMs: number;
  /** Probabilidade de o laudo do processador demorar além do próximo frame. */
  readonly slowWorkerRate: number;
  /** Probabilidade de fracasso do processador. */
  readonly failureRate: number;
}

const PROFILES: StreamProfile[] = [
  {
    name: 'limpo',
    duplicateRate: 0,
    reorderRate: 0,
    freezeRate: 0,
    freezeMs: 0,
    slowWorkerRate: 0.1,
    failureRate: 0.05,
  },
  {
    name: 'duplicatas',
    duplicateRate: 0.25,
    reorderRate: 0.05,
    freezeRate: 0,
    freezeMs: 0,
    slowWorkerRate: 0.2,
    failureRate: 0.1,
  },
  {
    name: 'reordenado',
    duplicateRate: 0.05,
    reorderRate: 0.3,
    freezeRate: 0.02,
    freezeMs: 1_200,
    slowWorkerRate: 0.3,
    failureRate: 0.15,
  },
  {
    name: 'congelando',
    duplicateRate: 0.02,
    reorderRate: 0.02,
    freezeRate: 0.18,
    freezeMs: 4_000,
    slowWorkerRate: 0.4,
    failureRate: 0.2,
  },
  {
    name: 'caos',
    duplicateRate: 0.2,
    reorderRate: 0.2,
    freezeRate: 0.25,
    freezeMs: 9_000,
    slowWorkerRate: 0.6,
    failureRate: 0.35,
  },
];

const CONFIGS: CadenceConfig[] = [
  DEFAULT_CADENCE,
  { ...DEFAULT_CADENCE, identifyBudget: 2, budgetWindowMs: 8_000 },
  { ...DEFAULT_CADENCE, maxConcurrentIdentify: 1, identifyIntervalMs: 400 },
];

interface OpenJob {
  readonly task: PipelineTask;
  readonly dueAtMs: number;
  readonly succeed: boolean;
}

interface TrajectoryTrace {
  /** Assinatura textual de tudo que aconteceu, em ordem. */
  readonly log: string[];
  /** Estado final serializado. */
  readonly finalState: string;
}

function runVideoTrajectory(
  seed: number,
  profile: StreamProfile,
  config: CadenceConfig,
  procCount: number,
  steps: number,
  verify: boolean
): TrajectoryTrace {
  const rnd = mulberry32(seed);
  const log: string[] = [];

  let state: PipelineState = createPipeline(`cam-${seed}`, config);
  const procs: VisionProcessor[] = [];
  for (let i = 0; i < procCount; i += 1) {
    const shape = SHAPES[(seed + i) % SHAPES.length]!;
    const p: VisionProcessor = {
      id: `p${i}`,
      ...shape,
      failureThreshold: 2 + (i % 2),
      quarantineMs: 3_000 + i * 500,
    };
    procs.push(p);
    state = registerProcessor(state, p);
  }

  let now = 1_700_000_000_000;
  let frameId = 0;
  let lastCapturedAtMs = Number.NEGATIVE_INFINITY;
  const open: OpenJob[] = [];
  /** Frames aceitos pelo barramento (não `out_of_order`). */
  let acceptedFrames = 0;

  const openFor = (id: string): number => open.filter((j) => j.task.processorId === id).length;

  const admit = (task: PipelineTask, atMs: number): void => {
    const slow = rnd() < profile.slowWorkerRate;
    const work = slow ? 600 + Math.floor(rnd() * 4_000) : 20 + Math.floor(rnd() * 120);
    open.push({ task, dueAtMs: atMs + work, succeed: rnd() > profile.failureRate });
    log.push(`admit ${task.processorId} ${task.kind} f${task.frameId}`);
  };

  /** V5/V6 — invariantes lidas do próprio barramento após cada transição. */
  const audit = (phase: string): void => {
    if (!verify) return;
    for (const p of procs) {
      const slot = state.bus.slots[p.id]!;
      /* V5 — em voo sem tarefa aberta é entrega órfã: processador mudo. */
      check(`V5 entrega órfã (${phase})`, slot.inFlightFrameId === null ? true : openFor(p.id) > 0);
      /* V2 — pendência é sempre unitária, por construção do tipo, e só existe
       * com o slot ocupado. */
      check(
        'V2 pendência só com slot ocupado',
        slot.pending === null || slot.inFlightFrameId !== null
      );
      /* V6 — contabilidade fechada por consumidor. */
      const s = slot.stats;
      const total =
        s.delivered +
        s.droppedStale +
        s.droppedInterval +
        s.droppedSuperseded +
        (slot.pending ? 1 : 0);
      check('V6 contabilidade de descarte fechada', total === acceptedFrames);
    }
  };

  for (let step = 0; step < steps; step += 1) {
    /* Baixas vencidas — o laudo pode chegar muito depois do frame. */
    for (let i = open.length - 1; i >= 0; i -= 1) {
      const job = open[i]!;
      if (job.dueAtMs > now) continue;
      open.splice(i, 1);
      const res = settleTask(state, job.task, job.succeed ? 'success' : 'failure', job.dueAtMs);
      state = res.state;
      log.push(
        `settle ${job.task.processorId} f${job.task.frameId} ${job.succeed ? 'ok' : 'fail'} late=${res.late}`
      );
      for (const t of res.tasks) admit(t, job.dueAtMs);
      audit('settle');
    }

    /* Gap de vídeo: a câmera congela e o relógio anda sem frames. */
    if (rnd() < profile.freezeRate) {
      now += profile.freezeMs;
      log.push(`freeze ${profile.freezeMs}`);
    }

    now += 30 + Math.floor(rnd() * 180);

    /* Escolha do frame publicado: novo, duplicata ou reordenado. */
    let publishedId: number;
    let capturedAtMs: number;
    const roll = rnd();
    if (roll < profile.duplicateRate && frameId > 0) {
      publishedId = frameId;
      capturedAtMs = lastCapturedAtMs;
    } else if (roll < profile.duplicateRate + profile.reorderRate && frameId > 2) {
      publishedId = frameId - 1 - Math.floor(rnd() * 2);
      capturedAtMs = lastCapturedAtMs - 100;
    } else {
      publishedId = frameId + 1;
      capturedAtMs = now - Math.floor(rnd() * 120);
    }

    const expectedOutOfOrder = publishedId <= frameId || capturedAtMs < lastCapturedAtMs;

    const observation: FrameObservation = {
      capturedAtMs,
      hasActivity: rnd() > 0.15,
      trackId: rnd() > 0.3 ? `t${Math.floor(rnd() * 3)}` : null,
      trackEverIdentified: rnd() > 0.6,
    };

    const droppedBefore = state.bus.droppedOutOfOrder;
    const tick = tickPipeline(state, { frameId: publishedId, capturedAtMs }, observation, now);
    state = tick.state;

    const wasOutOfOrder = state.bus.droppedOutOfOrder > droppedBefore;
    if (verify) {
      /* V3 — a régua do barramento coincide com a expectativa do emissor. */
      check('V3 fora de ordem detectado', wasOutOfOrder === expectedOutOfOrder);
      if (wasOutOfOrder) {
        check('V3 fora de ordem não vira tarefa', tick.tasks.length === 0);
        check(
          'V3 fora de ordem tem motivo declarado',
          tick.busDrops.some((d) => d.reason === 'out_of_order')
        );
      }
    }

    if (!wasOutOfOrder) {
      acceptedFrames += 1;
      frameId = publishedId;
      lastCapturedAtMs = capturedAtMs;
    }

    log.push(
      `tick f${publishedId} ooo=${wasOutOfOrder} tasks=${tick.tasks
        .map((t) => `${t.processorId}:${t.kind}`)
        .join(
          '+'
        )} refus=${tick.refusals.map((r) => `${r.processorId}:${r.reason}`).join('+')} drops=${tick.busDrops
        .map((d) => `${d.consumerId ?? '*'}:${d.reason}`)
        .join('+')}`
    );

    for (const t of tick.tasks) admit(t, now);
    audit('tick');
  }

  return { log, finalState: JSON.stringify(state) };
}

/* -------------------------------------------------------------------------- */
/* Bateria principal — centenas de cenários de vídeo maltratado                 */
/* -------------------------------------------------------------------------- */

let scenarios = 0;
for (let seed = 1; seed <= 60; seed += 1) {
  for (const profile of PROFILES) {
    for (const config of CONFIGS) {
      const procCount = 1 + (seed % 4);
      runVideoTrajectory(seed, profile, config, procCount, 90, true);
      scenarios += 1;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* V1 — determinismo byte a byte                                                */
/* -------------------------------------------------------------------------- */

for (let seed = 1; seed <= 40; seed += 1) {
  const profile = PROFILES[seed % PROFILES.length]!;
  const config = CONFIGS[seed % CONFIGS.length]!;
  const a = runVideoTrajectory(seed, profile, config, 3, 60, false);
  const b = runVideoTrajectory(seed, profile, config, 3, 60, false);
  check('V1 estado final idêntico', a.finalState === b.finalState);
  check('V1 trilha idêntica', a.log.join('\n') === b.log.join('\n'));
  scenarios += 2;
}

/* -------------------------------------------------------------------------- */
/* V2 — latest-wins isolado e explícito                                         */
/* -------------------------------------------------------------------------- */

for (let seed = 1; seed <= 120; seed += 1) {
  const p: VisionProcessor = {
    id: 'slow',
    capabilities: ['track'],
    minIntervalMs: 0,
    maxFrameAgeMs: 60_000,
    failureThreshold: 9,
    quarantineMs: 1_000,
  };
  let state = registerProcessor(createPipeline('cam-lw'), p);
  let now = 1_700_000_000_000 + seed;

  const obs = (t: number): FrameObservation => ({
    capturedAtMs: t,
    hasActivity: true,
    trackId: null,
    trackEverIdentified: false,
  });

  const first = tickPipeline(state, { frameId: 1, capturedAtMs: now }, obs(now), now);
  state = first.state;
  const busy = first.tasks[0];
  check('V2 primeira entrega vira tarefa', busy !== undefined);

  /* Enquanto o processador não dá baixa, chegam N frames. */
  const burst = 2 + (seed % 6);
  let superseded = 0;
  for (let i = 2; i <= 1 + burst; i += 1) {
    now += 40;
    const t = tickPipeline(state, { frameId: i, capturedAtMs: now }, obs(now), now);
    state = t.state;
    check('V2 ocupado não recebe tarefa nova', t.tasks.length === 0);
    superseded += t.busDrops.filter((d) => d.reason === 'superseded').length;
    const slot = state.bus.slots['slow']!;
    check('V2 pendência é sempre o frame mais recente', slot.pending?.frameId === i);
  }
  check('V2 intermediários descartados', superseded === burst - 1);

  /* A baixa promove a pendência — e só ela. */
  now += 20;
  const settled = settleTask(state, busy!, 'success', now);
  state = settled.state;
  check('V2 pendência promovida vira tarefa', settled.tasks.length === 1);
  check('V2 promovida é a mais recente', settled.tasks[0]?.frameId === 1 + burst);
  check('V2 sem pendência residual', state.bus.slots['slow']!.pending === null);
  scenarios += 1;
}

/* -------------------------------------------------------------------------- */
/* V4 — gap de vídeo: o frame que volta é velho e não engana ninguém            */
/* -------------------------------------------------------------------------- */

for (let seed = 1; seed <= 120; seed += 1) {
  const p: VisionProcessor = {
    id: 'g',
    capabilities: ['track'],
    minIntervalMs: 0,
    maxFrameAgeMs: 800,
    failureThreshold: 9,
    quarantineMs: 1_000,
  };
  let state = registerProcessor(createPipeline('cam-gap'), p);
  let now = 1_700_000_000_000 + seed * 13;

  const obs = (captured: number): FrameObservation => ({
    capturedAtMs: captured,
    hasActivity: true,
    trackId: null,
    trackEverIdentified: false,
  });

  const warm = tickPipeline(state, { frameId: 1, capturedAtMs: now }, obs(now), now);
  state = warm.state;
  if (warm.tasks[0]) state = settleTask(state, warm.tasks[0], 'success', now).state;

  /* Congelamento: o relógio anda, o frame não. O frame preso na placa chega
   * com idade muito acima do tolerado. */
  const gapMs = 2_000 + (seed % 7) * 1_500;
  const staleCapturedAtMs = now + 10;
  now += gapMs;

  const stale = tickPipeline(
    state,
    { frameId: 2, capturedAtMs: staleCapturedAtMs },
    obs(staleCapturedAtMs),
    now
  );
  state = stale.state;
  check('V4 frame do gap não vira tarefa', stale.tasks.length === 0);
  check(
    'V4 gap tem motivo declarado',
    stale.busDrops.some((d) => d.reason === 'stale') || stale.decision?.reason === 'stale_frame'
  );
  check('V4 gap não ocupa o slot', state.bus.slots['g']!.inFlightFrameId === null);
  check('V4 gap não deixa pendência', state.bus.slots['g']!.pending === null);

  /* Retomada com frame fresco: o pipeline volta a trabalhar imediatamente. */
  now += 100;
  const fresh = tickPipeline(state, { frameId: 3, capturedAtMs: now }, obs(now), now);
  // eslint-disable-next-line no-useless-assignment -- mantém o estado do pipeline avançado (simulação completa)
  state = fresh.state;
  check('V4 retomada produz tarefa', fresh.tasks.length === 1);
  check('V4 retomada não herda o buraco', fresh.tasks[0]?.frameId === 3);
  scenarios += 1;
}

/* -------------------------------------------------------------------------- */

if (failures.length > 0) {
  const unique = [...new Set(failures)];
  console.error(
    `❌ Onda 208-B: ${failures.length} falha(s) em ${assertions.toLocaleString('pt-BR')} asserções (${scenarios} cenários)`
  );
  for (const f of unique.slice(0, 20)) console.error(`   - ${f}`);
  process.exit(1);
}

console.log(
  `✅ Onda 208-B — vídeo maltratado: ${assertions.toLocaleString('pt-BR')} asserções em ${scenarios} cenários`
);
