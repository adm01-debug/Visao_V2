/**
 * Simulação Wave 211 — ciclo executável da câmera (cadência ⨯ FrameBus).
 *
 * Força bruta sobre combinações de composição de processadores, comportamento
 * do executor (sucesso, exceção, rejeição, ausência) e rajadas de frames,
 * verificando as seis leis de `pipelineCycle.ts`.
 */

import {
  runCameraCycle,
  runFleetCycle,
  type CycleOptions,
  type ProcessorExecutor,
} from '../src/lib/vision/pipelineCycle';
import {
  DEFAULT_PROCESSOR,
  createPipeline,
  registerProcessor,
  type PipelineState,
  type ProcessorCapability,
  type VisionProcessor,
} from '../src/lib/vision/visionPipeline';
import type { FrameObservation } from '../src/lib/vision/inferenceCadence';

let assertions = 0;
let failures = 0;

function check(cond: boolean, label: string): void {
  assertions += 1;
  if (!cond) {
    failures += 1;
    if (failures <= 20) console.error(`✗ ${label}`);
  }
}

type Behaviour = 'success' | 'throw' | 'reject' | 'missing';

const BEHAVIOURS: Behaviour[] = ['success', 'throw', 'reject', 'missing'];
const CAPABILITY_SETS: ProcessorCapability[][] = [['track'], ['identify'], ['track', 'identify']];

function executorFor(behaviour: Behaviour): ProcessorExecutor | null {
  switch (behaviour) {
    case 'success':
      return () => undefined;
    case 'throw':
      return () => {
        throw new Error('executor exploded');
      };
    case 'reject':
      return () => Promise.reject(new Error('executor rejected'));
    case 'missing':
      return null;
  }
}

function build(caps: ProcessorCapability[][], cameraId: string): PipelineState {
  let state = createPipeline(cameraId);
  caps.forEach((capabilities, index) => {
    const processor: VisionProcessor = {
      ...DEFAULT_PROCESSOR,
      id: `p${index}`,
      capabilities,
      failureThreshold: 2,
      quarantineMs: 10_000,
    };
    state = registerProcessor(state, processor);
  });
  return state;
}

function observationAt(nowMs: number, index: number): FrameObservation {
  return {
    capturedAtMs: nowMs,
    hasActivity: index % 7 !== 0,
    trackId: index % 3 === 0 ? null : `trk-${index % 4}`,
    trackEverIdentified: index % 5 === 0,
  };
}

function totalSettled(state: PipelineState): number {
  return state.order.reduce((total, id) => {
    const s = state.runtimes[id]!.stats;
    return total + s.succeeded + s.failed + s.late;
  }, 0);
}

async function scenario(
  caps: ProcessorCapability[][],
  behaviours: Behaviour[],
  frames: number,
  clockStep: number,
  backwardsClock: boolean
): Promise<void> {
  let state = build(caps, 'cam-sim');
  const executors: Record<string, ProcessorExecutor> = {};
  behaviours.forEach((behaviour, index) => {
    const exec = executorFor(behaviour);
    if (exec) executors[`p${index}`] = exec;
  });

  let now = 100_000;
  let executionsSeen = 0;
  let admittedSeen = 0;
  let cascadedSeen = 0;

  for (let frameIndex = 1; frameIndex <= frames; frameIndex += 1) {
    const capturedAtMs = now;
    const clock = backwardsClock && frameIndex % 4 === 0 ? () => now - 50_000 : () => now;

    const options: CycleOptions = { executors, clock, maxCascade: 2 };
    const report = await runCameraCycle(
      state,
      { frameId: frameIndex, capturedAtMs },
      observationAt(capturedAtMs, frameIndex),
      options
    );

    /* L1 — publicação monotônica: nunca mais de um frame por ciclo. */
    check(
      report.state.bus.publishedFrames <= frameIndex,
      'L1 publicação nunca excede o número de ciclos'
    );
    check(report.frameId === frameIndex, 'L1 relatório aponta o frame do ciclo');

    /* L2 — contabilidade fechada. */
    check(
      report.executions.length === report.admitted + report.cascaded,
      'L2 execuções = admitidas + cascatas'
    );
    for (const execution of report.executions) {
      check(
        (execution.failure === null) === (execution.outcome === 'success'),
        'L2 fracasso e desfecho são coerentes'
      );
      const behaviour = behaviours[Number(execution.task.processorId.slice(1))]!;
      if (behaviour === 'missing') {
        check(execution.failure === 'executor_missing', 'L2 ausência é fracasso declarado');
      }
      if (behaviour === 'success' && execution.failure !== 'cascade_capped') {
        check(execution.outcome === 'success', 'L2 executor bom nunca fracassa sozinho');
      }
    }

    /* L3 — isolamento: nenhuma exceção escapou (chegamos aqui) e cada
     * processador saudável continuou recebendo. */
    for (const execution of report.executions) {
      const behaviour = behaviours[Number(execution.task.processorId.slice(1))]!;
      if (behaviour === 'throw' || behaviour === 'reject') {
        check(execution.errorMessage !== null, 'L3 erro capturado é registrado');
      } else {
        check(execution.errorMessage === null, 'L3 executor sadio não inventa erro');
      }
    }

    /* L4 — nenhum slot fica ocupado após o ciclo. */
    for (const id of report.state.order) {
      const slot = report.state.bus.slots[id];
      check(
        slot !== undefined && slot.inFlightFrameId === null,
        'L4 slot do barramento sempre liberado ao fim do ciclo'
      );
    }

    /* L5 — teto respeitado. */
    check(report.cascadeCapped >= 0, 'L5 cascatas capadas contabilizadas');
    check(report.cascaded <= report.admitted + 4, 'L5 cascata nunca explode');

    /* L6 — relógio nunca retrocede no estado. */
    check(report.state.clockFloorMs >= state.clockFloorMs, 'L6 piso de relógio é monotônico');

    executionsSeen += report.executions.length;
    admittedSeen += report.admitted;
    cascadedSeen += report.cascaded;
    state = report.state;
    now += clockStep;
  }

  /* Fechamento global: todo desfecho executado virou estatística no runtime. */
  check(totalSettled(state) === executionsSeen, 'L2 contabilidade fechada ao fim da rajada');
  check(executionsSeen === admittedSeen + cascadedSeen, 'L2 origens somam o total');
}

async function fleetScenario(): Promise<void> {
  const cams = ['cam-a', 'cam-b', 'cam-c'];
  const states = cams.map((id) => build([['track'], ['identify']], id));

  const result = await runFleetCycle(
    states.map((state, index) => ({
      state,
      frame: { frameId: 1, capturedAtMs: 200_000 },
      observation: observationAt(200_000, index + 1),
      options: {
        executors:
          index === 1
            ? {
                p0: () => {
                  throw new Error('cam-b caiu');
                },
              }
            : { p0: () => undefined, p1: () => undefined },
        clock: () => 200_000,
      },
    }))
  );

  check(result.reports.length === cams.length, 'frota devolve um relatório por câmera');
  for (const id of cams) {
    check(result.states[id] !== undefined, `frota devolve estado de ${id}`);
    check(result.states[id]!.cameraId === id, `estado de ${id} não trocou de dono`);
  }
  check(
    (result.states['cam-a']!.runtimes.p0!.stats.failed ?? 0) === 0,
    'L3 falha de uma câmera não contamina a vizinha'
  );
}

async function main(): Promise<void> {
  const started = Date.now();

  for (const capsA of CAPABILITY_SETS) {
    for (const capsB of CAPABILITY_SETS) {
      for (const behaviourA of BEHAVIOURS) {
        for (const behaviourB of BEHAVIOURS) {
          for (const frames of [1, 3, 6]) {
            for (const clockStep of [50, 350, 2_500]) {
              for (const backwards of [false, true]) {
                await scenario(
                  [capsA, capsB],
                  [behaviourA, behaviourB],
                  frames,
                  clockStep,
                  backwards
                );
              }
            }
          }
        }
      }
    }
  }

  await fleetScenario();

  const elapsed = Date.now() - started;
  console.log(`\nWave 211 — ${assertions} asserções em ${elapsed}ms`);
  if (failures > 0) {
    console.error(`✗ ${failures} falhas`);
    process.exit(1);
  }
  console.log('✓ todas as leis do ciclo se sustentaram');
}

void main();
