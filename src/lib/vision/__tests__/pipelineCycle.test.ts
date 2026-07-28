import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_MAX_CASCADE,
  runCameraCycle,
  runFleetCycle,
  type CycleOptions,
} from '../pipelineCycle';
import {
  createPipeline,
  registerProcessor,
  DEFAULT_PROCESSOR,
  type PipelineState,
  type VisionProcessor,
} from '../visionPipeline';
import type { FrameObservation } from '../inferenceCadence';

function processor(
  id: string,
  capabilities: VisionProcessor['capabilities'],
  overrides: Partial<VisionProcessor> = {},
): VisionProcessor {
  return { ...DEFAULT_PROCESSOR, id, capabilities, ...overrides };
}

function pipelineWith(...processors: VisionProcessor[]): PipelineState {
  let state = createPipeline('cam-1');
  for (const p of processors) state = registerProcessor(state, p);
  return state;
}

function observation(nowMs: number, overrides: Partial<FrameObservation> = {}): FrameObservation {
  return {
    capturedAtMs: nowMs,
    hasActivity: true,
    trackId: 'trk-1',
    trackEverIdentified: false,
    ...overrides,
  };
}

function clockFrom(start: number, step = 5): () => number {
  let now = start;
  return () => {
    const value = now;
    now += step;
    return value;
  };
}

function optionsWith(
  executors: CycleOptions['executors'],
  start = 1_000,
): CycleOptions {
  return { executors, clock: clockFrom(start) };
}

describe('pipelineCycle (Onda 211)', () => {
  it('L1 — publica o frame uma única vez e executa as tarefas admitidas', async () => {
    const state = pipelineWith(processor('track', ['track']));
    const run = vi.fn();

    const report = await runCameraCycle(
      state,
      { frameId: 1, capturedAtMs: 1_000 },
      observation(1_000),
      optionsWith({ track: run }),
    );

    expect(report.admitted).toBe(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(report.state.bus.publishedFrames).toBe(1);
    expect(report.executions).toHaveLength(1);
    expect(report.executions[0]?.outcome).toBe('success');
  });

  it('L2 — executor ausente é fracasso declarado, nunca silêncio', async () => {
    const state = pipelineWith(processor('track', ['track']));

    const report = await runCameraCycle(
      state,
      { frameId: 1, capturedAtMs: 1_000 },
      observation(1_000),
      optionsWith({}),
    );

    expect(report.executions[0]?.failure).toBe('executor_missing');
    expect(report.executions[0]?.outcome).toBe('failure');
    expect(report.state.runtimes.track?.stats.failed).toBe(1);
  });

  it('L2 — toda tarefa admitida recebe exatamente um desfecho', async () => {
    const state = pipelineWith(
      processor('track', ['track']),
      processor('face', ['identify']),
    );

    const report = await runCameraCycle(
      state,
      { frameId: 1, capturedAtMs: 1_000 },
      observation(1_000),
      optionsWith({ track: () => undefined, face: () => undefined }),
    );

    const settled = report.state.order.reduce((total, id) => {
      const stats = report.state.runtimes[id]!.stats;
      return total + stats.succeeded + stats.failed + stats.late;
    }, 0);

    expect(report.executions.length).toBe(report.admitted + report.cascaded);
    expect(settled).toBe(report.executions.length);
  });

  it('L3 — exceção do executor não escapa e não contamina os demais', async () => {
    const state = pipelineWith(
      processor('boom', ['track']),
      processor('calm', ['track']),
    );

    const calm = vi.fn();
    const report = await runCameraCycle(
      state,
      { frameId: 1, capturedAtMs: 1_000 },
      observation(1_000),
      optionsWith({
        boom: () => {
          throw new Error('gpu offline');
        },
        calm,
      }),
    );

    expect(calm).toHaveBeenCalledTimes(1);
    const boom = report.executions.find((e) => e.task.processorId === 'boom');
    expect(boom?.failure).toBe('executor_threw');
    expect(boom?.errorMessage).toBe('gpu offline');
    expect(report.state.runtimes.calm?.stats.succeeded).toBe(1);
  });

  it('L3 — promessa rejeitada também vira fracasso contabilizado', async () => {
    const state = pipelineWith(processor('track', ['track']));

    const report = await runCameraCycle(
      state,
      { frameId: 1, capturedAtMs: 1_000 },
      observation(1_000),
      optionsWith({ track: () => Promise.reject(new Error('timeout')) }),
    );

    expect(report.executions[0]?.failure).toBe('executor_threw');
    expect(report.state.runtimes.track?.stats.failed).toBe(1);
  });

  it('L4 — as baixas são serializadas: nenhum estado é sobrescrito', async () => {
    const state = pipelineWith(
      processor('a', ['track']),
      processor('b', ['track']),
      processor('c', ['track']),
    );

    const order: string[] = [];
    const exec = (id: string) => async () => {
      await Promise.resolve();
      order.push(id);
    };

    const report = await runCameraCycle(
      state,
      { frameId: 1, capturedAtMs: 1_000 },
      observation(1_000),
      optionsWith({ a: exec('a'), b: exec('b'), c: exec('c') }),
    );

    expect(order).toEqual(['a', 'b', 'c']);
    for (const id of ['a', 'b', 'c']) {
      expect(report.state.runtimes[id]?.stats.succeeded).toBe(1);
    }
  });

  it('L5 — o teto de cascata é declarado e nenhum slot fica ocupado', async () => {
    const state = pipelineWith(processor('track', ['track']));

    const report = await runCameraCycle(
      state,
      { frameId: 1, capturedAtMs: 1_000 },
      observation(1_000),
      { executors: { track: () => undefined }, clock: clockFrom(1_000), maxCascade: 0 },
    );

    expect(report.cascadeCapped).toBeLessThanOrEqual(1);
    expect(report.state.bus.slots.track?.inFlightFrameId).toBeNull();
    expect(DEFAULT_MAX_CASCADE).toBeGreaterThan(0);
  });

  it('L6 — relógio retrocedido não encurta quarentena nem reabre orçamento', async () => {
    const state = pipelineWith(processor('track', ['track'], { failureThreshold: 1 }));

    const failing = await runCameraCycle(
      state,
      { frameId: 1, capturedAtMs: 5_000 },
      observation(5_000),
      { executors: { track: () => Promise.reject(new Error('x')) }, clock: () => 5_000 },
    );

    expect(failing.state.runtimes.track?.health).toBe('quarantined');

    /* Relógio volta no tempo: a quarentena não pode expirar. */
    const later = await runCameraCycle(
      failing.state,
      { frameId: 2, capturedAtMs: 5_400 },
      observation(5_400),
      { executors: { track: () => undefined }, clock: () => 1_000 },
    );


    expect(later.state.runtimes.track?.health).toBe('quarantined');
    expect(later.state.clockFloorMs).toBeGreaterThanOrEqual(5_000);
  });

  it('roda a frota em paralelo isolando cada câmera', async () => {
    const camA = registerProcessor(createPipeline('cam-a'), processor('track', ['track']));
    const camB = registerProcessor(createPipeline('cam-b'), processor('track', ['track']));

    const result = await runFleetCycle([
      {
        state: camA,
        frame: { frameId: 1, capturedAtMs: 1_000 },
        observation: observation(1_000),
        options: optionsWith({ track: () => undefined }),
      },
      {
        state: camB,
        frame: { frameId: 1, capturedAtMs: 1_000 },
        observation: observation(1_000),
        options: optionsWith({
          track: () => {
            throw new Error('down');
          },
        }),
      },
    ]);

    expect(Object.keys(result.states).sort()).toEqual(['cam-a', 'cam-b']);
    expect(result.states['cam-a']?.runtimes.track?.stats.succeeded).toBe(1);
    expect(result.states['cam-b']?.runtimes.track?.stats.failed).toBe(1);
  });
});
