/**
 * Onda 212 — Testes do livro de métricas.
 *
 * A simulação (`simulate:wave212`) prova as leis sob volume; estes testes
 * fixam as decisões de projeto em prosa executável, para que uma refatoração
 * futura precise *discordar por escrito* antes de quebrá-las.
 */

import { describe, expect, it } from 'vitest';
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
  type MetricsLedger,
} from '../pipelineMetrics';
import type { CycleExecution, CycleReport } from '../pipelineCycle';
import type { PipelineState } from '../visionPipeline';
import { createPipeline } from '../visionPipeline';

const STATE: PipelineState = createPipeline('cam-1');

function execution(overrides: Partial<CycleExecution> = {}): CycleExecution {
  return {
    task: {
      processorId: 'idy',
      kind: 'identify',
      frameId: 1,
      capturedAtMs: 1_000,
      trackId: 'trk-1',
    },
    startedAtMs: 1_020,
    settledAtMs: 1_100,
    queueLatencyMs: 20,
    executionMs: 80,
    totalLatencyMs: 100,
    outcome: 'success',
    failure: null,
    cascaded: false,
    late: false,
    errorMessage: null,
    ...overrides,
  };
}

function report(overrides: Partial<CycleReport> = {}): CycleReport {
  return {
    state: STATE,
    cameraId: 'cam-1',
    tickAtMs: 1_000,
    completedAtMs: 1_100,
    frameId: 1,
    decision: null,
    executions: [],
    refusals: [],
    busDrops: [],
    admitted: 0,
    cascaded: 0,
    cascadeCapped: 0,
    ...overrides,
  };
}

function fresh(): CameraMetrics {
  return createCameraMetrics('cam-1', 0, { ...DEFAULT_METRICS_CONFIG, windowMs: null });
}

describe('pipelineMetrics (Onda 212)', () => {
  it('M3 — a soma dos baldes de descarte é sempre o total', () => {
    const metrics = recordCycle(
      fresh(),
      report({
        busDrops: [
          { consumerId: 'idy', frameId: 1, reason: 'stale' },
          { consumerId: 'idy', frameId: 2, reason: 'superseded' },
        ],
        refusals: [{ processorId: 'idy', kind: 'identify', reason: 'cadence_skip', frameId: 1 }],
        decision: {
          action: 'skip',
          reason: 'stale_frame',
          trackId: null,
          effectiveNowMs: 1_000,
          budgetRemaining: 0,
        },
      }),
      { ...DEFAULT_METRICS_CONFIG, windowMs: null },
    );

    const sum = DROP_BUCKETS.reduce((acc, bucket) => acc + metrics.drops[bucket], 0);
    expect(sum).toBe(metrics.totalDrops);
    /* 2 do barramento + 1 recusa de contrato + 1 skip da cadência. */
    expect(metrics.totalDrops).toBe(4);
    expect(auditMetrics(metrics)).toEqual([]);
  });

  it('M2 — `stale_frame` (cadência) e `stale` (barramento) são baldes distintos', () => {
    const metrics = recordCycle(
      fresh(),
      report({
        busDrops: [{ consumerId: 'idy', frameId: 1, reason: 'stale' }],
        refusals: [{ processorId: 'idy', kind: 'identify', reason: 'cadence_skip', frameId: 1 }],
        decision: {
          action: 'skip',
          reason: 'stale_frame',
          trackId: null,
          effectiveNowMs: 1_000,
          budgetRemaining: 0,
        },
      }),
      { ...DEFAULT_METRICS_CONFIG, windowMs: null },
    );

    const view = viewCameraMetrics(metrics);
    /* Confundir os dois manda o operador consertar a rede quando o problema é
     * o modelo lento — e vice-versa. */
    expect(view.staleFrameDrops).toBe(1);
    expect(view.staleBusDrops).toBe(1);
  });

  it('M4 — executor ausente não gera custo nem sucesso', () => {
    const metrics = recordCycle(
      fresh(),
      report({
        executions: [
          execution({
            startedAtMs: null,
            executionMs: null,
            queueLatencyMs: null,
            outcome: 'failure',
            failure: 'executor_missing',
          }),
        ],
      }),
      { ...DEFAULT_METRICS_CONFIG, windowMs: null },
    );

    expect(metrics.cost.unitsSpent).toBe(0);
    expect(metrics.executorMissing).toBe(1);
    expect(metrics.succeeded).toBe(0);
  });

  it('M5 — executor que explode ainda paga o custo e conta a duração', () => {
    const metrics = recordCycle(
      fresh(),
      report({
        executions: [
          execution({ outcome: 'failure', failure: 'executor_threw' }),
        ],
      }),
      { ...DEFAULT_METRICS_CONFIG, windowMs: null },
    );

    /* GPU queimada cobra igual: esconder o gasto da falha subestima a conta. */
    expect(metrics.cost.unitsSpent).toBe(12);
    expect(metrics.executionLatency.count).toBe(1);
    expect(metrics.failed).toBe(1);
  });

  it('M6 — latência acima da régua é declarada saturada, nunca truncada', () => {
    const metrics = recordCycle(
      fresh(),
      report({
        executions: [execution({ totalLatencyMs: 10 * 60_000 })],
      }),
      { ...DEFAULT_METRICS_CONFIG, windowMs: null },
    );

    const view = viewCameraMetrics(metrics);
    expect(view.latencySaturated).toBe(true);
    /* Um p95 inventado no último balde seria uma mentira otimista. */
    expect(view.p95TotalLatencyMs).toBeNull();
    expect(view.verdict).toBe('critical');
  });

  it('M7 — relógio que retrocede não move o piso da janela', () => {
    const config = { ...DEFAULT_METRICS_CONFIG, windowMs: null };
    let metrics = recordCycle(fresh(), report({ completedAtMs: 5_000 }), config);
    const floor = metrics.clockFloorMs;
    metrics = recordCycle(
      metrics,
      report({ tickAtMs: 100, completedAtMs: 200 }),
      config,
    );
    expect(metrics.clockFloorMs).toBe(floor);
  });

  it('M8 — a virada de janela é declarada e zera os contadores', () => {
    const config = { ...DEFAULT_METRICS_CONFIG, windowMs: 1_000 };
    let metrics = createCameraMetrics('cam-1', 0, config);
    metrics = recordCycle(metrics, report({ tickAtMs: 0, completedAtMs: 10 }), config);
    expect(metrics.framesSeen).toBe(1);

    metrics = recordCycle(
      metrics,
      report({ tickAtMs: 50_000, completedAtMs: 50_010 }),
      config,
    );
    expect(metrics.rolledOverAtMs).not.toBeNull();
    expect(metrics.framesSeen).toBe(1);
  });

  it('ausência de leitura é `unknown`, jamais `nominal`', () => {
    expect(viewCameraMetrics(fresh()).verdict).toBe('unknown');
  });

  it('frota — o pior governa e o empate ordena por identificador', () => {
    const config = { ...DEFAULT_METRICS_CONFIG, windowMs: null };
    let ledger: MetricsLedger = {};
    ledger = recordFleetCycle(ledger, report({ cameraId: 'cam-b' }), config);
    ledger = recordFleetCycle(
      ledger,
      report({
        cameraId: 'cam-a',
        executions: [execution({ totalLatencyMs: 9_000 })],
      }),
      config,
    );

    const fleet = viewFleetMetrics(ledger);
    expect(fleet.cameras[0]?.cameraId).toBe('cam-a');
    expect(fleet.verdict).toBe('critical');
    expect(fleet.counts.critical).toBe(1);
  });
});
