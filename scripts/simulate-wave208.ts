/**
 * Onda 208 — Simulação exaustiva do contrato `VisionProcessor`.
 *
 *  T1. Barramento antes da cadência — nenhuma tarefa sem entrega do FrameBus.
 *  T2. Capacidade — nenhum processador recebe tarefa fora do que declarou.
 *  T3. Exclusividade cara — no máximo UMA identificação por tick.
 *  T4. Orçamento honesto — identificações debitadas nunca excedem o teto da
 *      janela, e identificação não assumida nunca é cobrada.
 *  T5. Concorrência — em voo nunca ultrapassa `maxConcurrentIdentify`.
 *  T6. Quarentena — suspenso não recebe tarefa; volta em `probation`; um único
 *      fracasso em observação suspende de novo; sucesso reabilita.
 *  T7. Laudo tardio — resultado de frame superado marca `late` e nunca altera
 *      a saúde do processador.
 *  T8. Contabilidade fechada — admitidos = sucessos + falhas + tardios + em voo.
 *  T9. Pureza — `tickPipeline` não muta o estado recebido.
 */

import {
  DEFAULT_CADENCE,
  type CadenceConfig,
  type FrameObservation,
} from '../src/lib/vision/inferenceCadence';
import {
  createPipeline,
  describePipeline,
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

const SHAPES: ReadonlyArray<Pick<VisionProcessor, 'capabilities' | 'minIntervalMs' | 'maxFrameAgeMs'>> = [
  { capabilities: ['track'], minIntervalMs: 0, maxFrameAgeMs: 900 },
  { capabilities: ['identify'], minIntervalMs: 0, maxFrameAgeMs: 900 },
  { capabilities: ['track', 'identify'], minIntervalMs: 0, maxFrameAgeMs: 900 },
  { capabilities: ['track'], minIntervalMs: 500, maxFrameAgeMs: 300 },
  { capabilities: ['track', 'identify'], minIntervalMs: 1_000, maxFrameAgeMs: 60_000 },
];

interface Pending {
  readonly task: PipelineTask;
  readonly dueAtMs: number;
  readonly succeed: boolean;
}

function runTrajectory(seed: number, procCount: number, steps: number, config: CadenceConfig): void {
  const rnd = mulberry32(seed);
  let state: PipelineState = createPipeline(`cam-${seed}`, config);

  const procs: VisionProcessor[] = [];
  for (let i = 0; i < procCount; i += 1) {
    const shape = SHAPES[(seed + i) % SHAPES.length]!;
    const p: VisionProcessor = {
      id: `p${i}`,
      ...shape,
      failureThreshold: 2 + (i % 3),
      quarantineMs: 5_000 + i * 1_000,
    };
    procs.push(p);
    state = registerProcessor(state, p);
  }
  const byId = new Map(procs.map((p) => [p.id, p]));

  let now = 1_700_000_000_000;
  let frameId = 0;
  const inFlight: Pending[] = [];
  const identifyStamps: number[] = [];
  const seenFrameByProc = new Map<string, number>();

  const admit = (task: PipelineTask, atMs: number): void => {
    const p = byId.get(task.processorId)!;
    check('T2 capacidade', p.capabilities.includes(task.kind));
    check(
      'T6 suspenso não recebe',
      state.runtimes[task.processorId]!.health !== 'quarantined',
    );
    const work = 30 + Math.floor(rnd() * 900);
    inFlight.push({ task, dueAtMs: atMs + work, succeed: rnd() > 0.28 });
    seenFrameByProc.set(task.processorId, task.frameId);
  };

  for (let step = 0; step < steps; step += 1) {
    now += 30 + Math.floor(rnd() * 200);

    /* Baixas vencidas. */
    for (let i = inFlight.length - 1; i >= 0; i -= 1) {
      const job = inFlight[i]!;
      if (job.dueAtMs > now) continue;
      inFlight.splice(i, 1);
      const healthBefore = state.runtimes[job.task.processorId]!.health;
      const res = settleTask(state, job.task, job.succeed ? 'success' : 'failure', job.dueAtMs);
      state = res.state;
      if (res.late) {
        check(
          'T7 tardio não muda saúde',
          state.runtimes[job.task.processorId]!.health === healthBefore,
        );
      }
      for (const t of res.tasks) admit(t, job.dueAtMs);
    }

    /* Laudo tardio deliberado: 8% das vezes, reenvia um frame antigo. */
    if (rnd() < 0.08 && frameId > 2) {
      const victim = procs[Math.floor(rnd() * procs.length)]!;
      const fake: PipelineTask = {
        processorId: victim.id,
        kind: victim.capabilities[0]!,
        frameId: 1,
        capturedAtMs: now,
        trackId: null,
      };
      const before = state.runtimes[victim.id]!;
      const res = settleTask(state, fake, 'failure', now);
      if (res.late) {
        check('T7 tardio é só estatística', res.state.runtimes[victim.id]!.health === before.health);
        check('T7 contador de tardio', res.state.runtimes[victim.id]!.stats.late === before.stats.late + 1);
        state = res.state;
      }
    }

    frameId += 1;
    const observation: FrameObservation = {
      capturedAtMs: now - Math.floor(rnd() * 300),
      hasActivity: rnd() > 0.2,
      trackId: rnd() > 0.35 ? `t${Math.floor(rnd() * 4)}` : null,
      trackEverIdentified: rnd() > 0.5,
    };

    const snapshot = JSON.stringify(state);
    const tick = tickPipeline(
      state,
      { frameId, capturedAtMs: observation.capturedAtMs },
      observation,
      now,
    );
    check('T9 pureza', JSON.stringify(state) === snapshot);
    state = tick.state;

    const identifies = tick.tasks.filter((t) => t.kind === 'identify');
    check('T3 exclusividade cara', identifies.length <= 1);
    if (identifies.length === 1) identifyStamps.push(tick.decision!.effectiveNowMs);

    check(
      'T1 barramento antes da cadência',
      tick.tasks.length === 0 || tick.decision !== null,
    );

    for (const t of tick.tasks) {
      check('T1 frame coerente', t.frameId === frameId);
      admit(t, now);
    }

    /* T4/T5 — invariantes de custo lidas do próprio livro da cadência. */
    const live = identifyStamps.filter((s) => s > now - config.budgetWindowMs);
    check('T4 orçamento', live.length <= config.identifyBudget);
    check('T5 concorrência', state.cadence.inFlightIdentify <= config.maxConcurrentIdentify);
    check('T5 concorrência não negativa', state.cadence.inFlightIdentify >= 0);
  }

  /* T8 — contabilidade fechada. */
  const view = describePipeline(state);
  for (const p of view.processors) {
    const openJobs = inFlight.filter((j) => j.task.processorId === p.processorId).length;
    check(
      'T8 contabilidade fechada',
      p.stats.admitted === p.stats.succeeded + p.stats.failed + openJobs,
    );
    check(
      'T8 razão coerente',
      p.successRatio === null || (p.successRatio >= 0 && p.successRatio <= 1),
    );
  }
}

const CONFIGS: CadenceConfig[] = [
  DEFAULT_CADENCE,
  { ...DEFAULT_CADENCE, identifyBudget: 3, budgetWindowMs: 10_000 },
  { ...DEFAULT_CADENCE, maxConcurrentIdentify: 1, identifyIntervalMs: 500 },
  { ...DEFAULT_CADENCE, trackIntervalMs: 0, identifyIntervalMs: 0, identifyBudget: 5 },
];

for (let seed = 1; seed <= 180; seed += 1) {
  for (const config of CONFIGS) {
    runTrajectory(seed, 1 + (seed % 5), 140, config);
  }
}

/* -------------------------------------------------------------------------- */
/* T6 — ciclo completo da quarentena, determinístico                           */
/* -------------------------------------------------------------------------- */

for (let seed = 1; seed <= 300; seed += 1) {
  const p: VisionProcessor = {
    id: 'q',
    capabilities: ['track'],
    minIntervalMs: 0,
    maxFrameAgeMs: 10_000,
    failureThreshold: 2,
    quarantineMs: 1_000,
  };
  let state = registerProcessor(createPipeline('cam-q'), p);
  let now = 1_700_000_000_000 + seed;
  let fid = 0;

  const push = (): PipelineTask | null => {
    fid += 1;
    now += 400;
    const tick = tickPipeline(
      state,
      { frameId: fid, capturedAtMs: now },
      { capturedAtMs: now, hasActivity: true, trackId: null, trackEverIdentified: false },
      now,
    );
    state = tick.state;
    return tick.tasks[0] ?? null;
  };

  const t1 = push();
  check('T6 primeira tarefa', t1 !== null);
  state = settleTask(state, t1!, 'failure', now).state;
  check('T6 degraded após 1ª falha', state.runtimes['q']!.health === 'degraded');

  const t2 = push();
  check('T6 degradado ainda trabalha', t2 !== null);
  state = settleTask(state, t2!, 'failure', now).state;
  check('T6 quarentena no limiar', state.runtimes['q']!.health === 'quarantined');

  const t3 = push();
  check('T6 suspenso não recebe tarefa', t3 === null);

  now += 2_000; // quarentena vencida
  const t4 = push();
  check('T6 volta em observação com tarefa', t4 !== null);
  check('T6 estado probation', state.runtimes['q']!.health === 'probation');

  /* Um único fracasso em observação suspende de novo — nunca segunda chance. */
  const relapse = settleTask(state, t4!, 'failure', now);
  check('T6 recaída suspende', relapse.state.runtimes['q']!.health === 'quarantined');

  /* Sucesso em observação reabilita por completo. */
  const cured = settleTask(state, t4!, 'success', now);
  check('T6 sucesso reabilita', cured.state.runtimes['q']!.health === 'healthy');
  check('T6 falhas zeradas', cured.state.runtimes['q']!.consecutiveFailures === 0);
}

/* -------------------------------------------------------------------------- */
/* T4 — identificação não assumida nunca é cobrada                             */
/* -------------------------------------------------------------------------- */

for (let seed = 1; seed <= 200; seed += 1) {
  const onlyTrack: VisionProcessor = {
    id: 'tr',
    capabilities: ['track'],
    minIntervalMs: 0,
    maxFrameAgeMs: 10_000,
    failureThreshold: 5,
    quarantineMs: 1_000,
  };
  let state = registerProcessor(createPipeline('cam-cost'), onlyTrack);
  let now = 1_700_000_000_000 + seed * 7;

  for (let i = 1; i <= 12; i += 1) {
    now += 3_000;
    const tick = tickPipeline(
      state,
      { frameId: i, capturedAtMs: now },
      { capturedAtMs: now, hasActivity: true, trackId: `t${i}`, trackEverIdentified: false },
      now,
    );
    state = tick.state;
    check('T4 sem identificação sem quem identifique', tick.tasks.every((t) => t.kind === 'track'));
  }
  check('T4 orçamento intacto', state.cadence.recentIdentifyAtMs.length === 0);
  check('T4 nada em voo', state.cadence.inFlightIdentify === 0);
}

/* -------------------------------------------------------------------------- */

if (failures.length > 0) {
  const unique = [...new Set(failures)];
  console.error(`❌ Onda 208: ${failures.length} falha(s) em ${assertions} asserções`);
  for (const f of unique.slice(0, 20)) console.error(`   - ${f}`);
  process.exit(1);
}

console.log(`✅ Onda 208 — VisionProcessor: ${assertions.toLocaleString('pt-BR')} asserções aprovadas`);
