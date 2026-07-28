/**
 * Onda 212 — Simulação do livro de métricas de latência e custo.
 *
 * Não basta o livro compilar: ele precisa fechar sob maus-tratos. Esta bateria
 * roda o ciclo real (Onda 211) contra executores lentos, travados, que explodem
 * e que somem, com relógio que retrocede e frames que chegam velhos — e prova
 * as oito leis do módulo em cada passo.
 *
 * Rodar: npm run simulate:wave212
 */

import {
  runCameraCycle,
  type CycleOptions,
  type CycleReport,
} from '../src/lib/vision/pipelineCycle';
import {
  auditMetrics,
  createCameraMetrics,
  recordCycle,
  recordFleetCycle,
  viewCameraMetrics,
  viewFleetMetrics,
  DEFAULT_METRICS_CONFIG,
  DROP_BUCKETS,
  type CameraMetrics,
  type MetricsConfig,
  type MetricsLedger,
} from '../src/lib/vision/pipelineMetrics';
import {
  createPipeline,
  registerProcessor,
  DEFAULT_PROCESSOR,
  type PipelineState,
  type VisionProcessor,
} from '../src/lib/vision/visionPipeline';
import type { FrameObservation } from '../src/lib/vision/inferenceCadence';
import type { BusFrame } from '../src/lib/vision/frameBus';

/* ------------------------------------------------------------------ */
/* Infra da simulação                                                   */
/* ------------------------------------------------------------------ */

let assertions = 0;
const failures: string[] = [];

function check(label: string, condition: boolean): void {
  assertions += 1;
  if (!condition) failures.push(label);
}

/** PRNG determinístico (mulberry32): mesma semente, mesma bateria. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function processor(id: string, capabilities: VisionProcessor['capabilities']): VisionProcessor {
  return { ...DEFAULT_PROCESSOR, id, capabilities };
}

/**
 * Relógio controlado: avança sozinho em cada leitura (custo de instrumentação)
 * e aceita saltos explícitos do executor (o trabalho de verdade).
 */
class Clock {
  private nowMs: number;
  constructor(start: number, private readonly tickCostMs: number) {
    this.nowMs = start;
  }
  read = (): number => {
    const value = this.nowMs;
    this.nowMs += this.tickCostMs;
    return value;
  };
  advance(ms: number): void {
    this.nowMs += ms;
  }
  /** Relógio para trás — o pesadelo do NTP. */
  rewind(ms: number): void {
    this.nowMs -= ms;
  }
  peek(): number {
    return this.nowMs;
  }
}

type ExecutorKind = 'fast' | 'slow' | 'stalled' | 'throws' | 'missing';

const EXECUTOR_KINDS: readonly ExecutorKind[] = [
  'fast',
  'slow',
  'stalled',
  'throws',
  'missing',
];

const EXECUTOR_COST_MS: Readonly<Record<ExecutorKind, number>> = {
  fast: 5,
  slow: 180,
  stalled: 9_000,
  throws: 40,
  missing: 0,
};

function executorsFor(
  kind: ExecutorKind,
  ids: readonly string[],
  clock: Clock,
): CycleOptions['executors'] {
  if (kind === 'missing') return {};
  const map: Record<string, () => void> = {};
  for (const id of ids) {
    map[id] = () => {
      clock.advance(EXECUTOR_COST_MS[kind]);
      if (kind === 'throws') throw new Error(`boom:${id}`);
    };
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* Cenário                                                             */
/* ------------------------------------------------------------------ */

interface ScenarioSpec {
  readonly seed: number;
  readonly executorKind: ExecutorKind;
  /** Fração de frames publicados já velhos. */
  readonly staleRate: number;
  /** Fração de frames sem atividade. */
  readonly idleRate: number;
  /** Fração de leituras em que o relógio retrocede. */
  readonly rewindRate: number;
  readonly frames: number;
  readonly config: MetricsConfig;
}

interface ScenarioResult {
  readonly metrics: CameraMetrics;
  readonly reports: readonly CycleReport[];
}

async function runScenario(spec: ScenarioSpec): Promise<ScenarioResult> {
  const random = rng(spec.seed);
  const clock = new Clock(1_000_000, 1);

  let pipeline: PipelineState = createPipeline('cam-sim');
  pipeline = registerProcessor(pipeline, processor('track', ['track']));
  pipeline = registerProcessor(pipeline, processor('idy', ['track', 'identify']));

  const executors = executorsFor(spec.executorKind, ['track', 'idy'], clock);
  const options: CycleOptions = { executors, clock: clock.read };

  let metrics = createCameraMetrics('cam-sim', clock.peek(), spec.config);
  const reports: CycleReport[] = [];

  for (let i = 0; i < spec.frames; i += 1) {
    /* O tempo entre frames também passa fora do ciclo. */
    clock.advance(60 + Math.floor(random() * 400));

    if (random() < spec.rewindRate) clock.rewind(500);

    const stale = random() < spec.staleRate;
    const idle = random() < spec.idleRate;
    const capturedAtMs = clock.peek() - (stale ? 5_000 : 10);

    const frame: BusFrame = { frameId: i + 1, capturedAtMs };
    const observation: FrameObservation = {
      capturedAtMs,
      hasActivity: !idle,
      trackId: idle ? null : `trk-${i % 3}`,
      trackEverIdentified: random() < 0.5,
    };

    const report = await runCameraCycle(pipeline, frame, observation, options);
    pipeline = report.state;
    reports.push(report);

    const before = metrics;
    metrics = recordCycle(before, report, spec.config);

    /* -------- Leis verificadas a cada frame -------- */

    /* M3 — contabilidade fechada, sempre. */
    check('M3 auditoria limpa', auditMetrics(metrics).length === 0);

    /* M1 — latência jamais negativa, jamais NaN. */
    for (const execution of report.executions) {
      check('M1 total ≥ 0', execution.totalLatencyMs >= 0);
      check('M1 total finito', Number.isFinite(execution.totalLatencyMs));
      check(
        'M1 fila ≥ 0',
        execution.queueLatencyMs === null || execution.queueLatencyMs >= 0,
      );
      check(
        'M1 duração ≥ 0',
        execution.executionMs === null || execution.executionMs >= 0,
      );
      /* M1 — sem executor não há duração inventada. */
      if (execution.failure === 'executor_missing') {
        check('M1 ausente sem duração', execution.executionMs === null);
        check('M1 ausente sem início', execution.startedAtMs === null);
      }
      /* Executor que explodiu ainda tem duração medida (M5). */
      if (execution.failure === 'executor_threw') {
        check('M5 falha medida', execution.executionMs !== null);
      }
    }

    /* M7 — o relógio do livro nunca anda para trás. */
    check('M7 relógio monotônico', metrics.clockFloorMs >= before.clockFloorMs);

    /* Contadores só crescem dentro da mesma janela (M8: virada é declarada). */
    if (metrics.rolledOverAtMs === before.rolledOverAtMs) {
      check('monotonicidade de frames', metrics.framesSeen >= before.framesSeen);
      check('monotonicidade de descartes', metrics.totalDrops >= before.totalDrops);
      check('monotonicidade de custo', metrics.cost.unitsSpent >= before.cost.unitsSpent);
    }

    /* M4/M5 — custo só existe quando houve chamada. */
    const charged = report.executions.filter((e) => e.startedAtMs !== null).length;
    check(
      'M4 custo só na execução',
      metrics.cost.trackRuns + metrics.cost.identifyRuns >=
        before.cost.trackRuns + before.cost.identifyRuns + (metrics.rolledOverAtMs === before.rolledOverAtMs ? charged : 0),
    );
  }

  return { metrics, reports };
}

/* ------------------------------------------------------------------ */
/* Bateria                                                             */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const configs: MetricsConfig[] = [
    DEFAULT_METRICS_CONFIG,
    { ...DEFAULT_METRICS_CONFIG, windowMs: null },
    { ...DEFAULT_METRICS_CONFIG, windowMs: 2_000 },
    { ...DEFAULT_METRICS_CONFIG, cost: { track: 1, identify: 1 } },
  ];

  let scenarios = 0;

  for (const executorKind of EXECUTOR_KINDS) {
    for (const config of configs) {
      for (const staleRate of [0, 0.35, 0.9]) {
        for (const idleRate of [0, 0.3]) {
          for (const rewindRate of [0, 0.25]) {
            for (let seedBump = 0; seedBump < 3; seedBump += 1) {
              scenarios += 1;
              const spec: ScenarioSpec = {
                seed: 7717 + scenarios * 31 + seedBump,
                executorKind,
                staleRate,
                idleRate,
                rewindRate,
                frames: 40,
                config,
              };

              const first = await runScenario(spec);
              const second = await runScenario(spec);

              /* Determinismo byte a byte: mesma semente, mesmo livro. */
              check(
                'D1 determinismo do livro',
                JSON.stringify(first.metrics) === JSON.stringify(second.metrics),
              );

              const metrics = first.metrics;
              const view = viewCameraMetrics(metrics);

              /* M2 — frame velho nunca some sem balde. */
              if (staleRate > 0.5 && metrics.rolledOverAtMs === null) {
                const staleSeen = metrics.drops.stale_frame + metrics.drops.stale;
                if (staleSeen === 0) console.log('DBG', JSON.stringify({ executorKind, staleRate, idleRate, rewindRate, window: config.windowMs, frames: metrics.framesSeen, drops: metrics.drops }));
                check('M2 frame velho contabilizado', staleSeen > 0);
              }

              /* M3 — soma dos baldes é o total, sempre. */
              const bucketSum = DROP_BUCKETS.reduce((acc, b) => acc + metrics.drops[b], 0);
              check('M3 soma dos baldes', bucketSum === metrics.totalDrops);

              /* M3 — desfechos batem com amostras. */
              check(
                'M3 desfechos = amostras',
                metrics.succeeded + metrics.failed === metrics.totalLatency.count,
              );

              /* M6 — percentil respeitado: p50 ≤ p95 quando ambos existem. */
              if (metrics.totalLatency.p50Ms !== null && metrics.totalLatency.p95Ms !== null) {
                check('M6 p50 ≤ p95', metrics.totalLatency.p50Ms <= metrics.totalLatency.p95Ms);
              }
              /* M6 — saturado nunca finge um p95. */
              if (metrics.totalLatency.saturated) {
                check('M6 saturado sem p95 falso', metrics.totalLatency.p95Ms === null);
              }
              /* M6 — max nunca é menor que a média. */
              if (metrics.totalLatency.maxMs !== null && metrics.totalLatency.meanMs !== null) {
                check('M6 max ≥ média', metrics.totalLatency.maxMs >= metrics.totalLatency.meanMs);
                check('M6 min ≤ média', (metrics.totalLatency.minMs ?? 0) <= metrics.totalLatency.meanMs);
              }

              /* M4 — executor ausente nunca gera gasto. */
              if (executorKind === 'missing') {
                check('M4 sem executor, sem gasto', metrics.cost.unitsSpent === 0);
                check('M4 sem executor, sem sucesso', metrics.succeeded === 0);
              }

              /* Executor travado (9 s) satura a régua: veredito é crítico, e
               * jamais "nominal" — a pior mentira possível aqui. */
              if (executorKind === 'stalled' && metrics.totalLatency.count > 0) {
                check('V1 travado é crítico', view.verdict === 'critical');
              }

              /* Veredito nunca é `nominal` sem nenhuma observação. */
              if (metrics.totalLatency.count === 0 && metrics.totalDrops === 0) {
                check('V2 ausência é unknown', view.verdict === 'unknown');
              }

              /* Razão de descarte é fração válida ou honesta ausência. */
              check(
                'V3 razão válida',
                view.dropRatio === null || (view.dropRatio >= 0 && Number.isFinite(view.dropRatio)),
              );
              check(
                'V4 economia entre 0 e 1',
                view.savingsRatio === null ||
                  (view.savingsRatio >= 0 && view.savingsRatio <= 1),
              );

              /* Frota: pior primeiro e soma consistente. */
              let ledger: MetricsLedger = {};
              for (const report of first.reports) {
                ledger = recordFleetCycle(ledger, report, config);
              }
              const fleet = viewFleetMetrics(ledger);
              check('F1 frota tem a câmera', fleet.cameras.length === 1);
              check(
                'F2 veredito da frota é o pior',
                fleet.verdict === fleet.cameras[0]!.verdict,
              );
              check(
                'F3 soma de baldes da frota',
                fleet.counts.unknown +
                  fleet.counts.nominal +
                  fleet.counts.strained +
                  fleet.counts.critical ===
                  fleet.cameras.length,
              );
            }
          }
        }
      }
    }
  }

  /* ---- Ordenação da frota: pior primeiro, empate por id (determinismo) ---- */
  {
    const base = createCameraMetrics('cam-b', 0, DEFAULT_METRICS_CONFIG);
    const ledger: MetricsLedger = { 'cam-b': base, 'cam-a': { ...base, cameraId: 'cam-a' } };
    const fleet = viewFleetMetrics(ledger);
    check('F4 empate ordena por id', fleet.cameras[0]!.cameraId === 'cam-a');
  }

  if (failures.length > 0) {
    const unique = [...new Set(failures)];
    console.error(`❌ Onda 212 — ${failures.length} violações (${unique.length} distintas):`);
    for (const violation of unique.slice(0, 20)) console.error(`   • ${violation}`);
    process.exit(1);
  }

  console.log(
    `✅ Onda 212 — métricas de latência e custo: ${assertions.toLocaleString('pt-BR')} asserções em ${scenarios} cenários`,
  );
}

void main();
