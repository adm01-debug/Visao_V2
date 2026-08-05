import { describe, expect, it } from 'vitest';
import {
  summarizeCamera,
  summarizeFleet,
  worstHealth,
  type CameraPipelineInput,
} from '../pipelineFleet';
import type { BusView, ConsumerHealth, ConsumerView } from '../frameBus';
import type { PipelineView, ProcessorHealth, ProcessorView } from '../visionPipeline';

function proc(id: string, health: ProcessorHealth, succeeded = 1, failed = 0): ProcessorView {
  return {
    processorId: id,
    capabilities: ['track'],
    health,
    stats: { admitted: succeeded + failed, succeeded, failed, late: 0, refused: 0 },
    successRatio: succeeded + failed === 0 ? null : succeeded / (succeeded + failed),
  };
}

function cons(id: string, health: ConsumerHealth): ConsumerView {
  return {
    consumerId: id,
    health,
    inFlight: false,
    hasPending: false,
    stats: {
      delivered: health === 'starved' ? 0 : 1,
      droppedStale: 0,
      droppedInterval: 0,
      droppedSuperseded: 0,
    },
    deliveryRatio: health === 'starved' ? 0 : 1,
  };
}

function cam(
  cameraId: string,
  processors: ProcessorView[],
  consumers: ConsumerView[],
  publishedFrames = 10
): CameraPipelineInput {
  const pipeline: PipelineView = {
    cameraId,
    processors,
    degraded: processors.some((p) => p.health !== 'healthy'),
  };
  const bus: BusView = { cameraId, publishedFrames, droppedOutOfOrder: 0, consumers };
  return { pipeline, bus };
}

describe('pipelineFleet', () => {
  it('F1 — o pior processador governa a câmera', () => {
    const s = summarizeCamera(
      cam(
        'cam',
        [proc('a', 'healthy'), proc('b', 'quarantined'), proc('c', 'healthy')],
        [cons('a', 'flowing')]
      )
    );
    expect(s.health).toBe('quarantined');
    expect(s.impairedCount).toBe(1);
  });

  it('F2 — câmera sem processador é desconhecida, nunca saudável', () => {
    const s = summarizeCamera(cam('cam', [], [cons('a', 'flowing')]));
    expect(s.health).toBe('unknown');
    expect(s.headline).toBe('Sem processador registrado');
  });

  it('F3 — sem desfecho a confiabilidade é nula, não 100%', () => {
    const s = summarizeCamera(cam('cam', [proc('a', 'healthy', 0, 0)], [cons('a', 'flowing')]));
    expect(s.successRatio).toBeNull();
  });

  it('F4 — barramento faminto não rebaixa a saúde do processador', () => {
    const s = summarizeCamera(cam('cam', [proc('a', 'healthy')], [cons('a', 'starved')]));
    expect(s.health).toBe('healthy');
    expect(s.pressure).toBe('starved');
  });

  it('F7 — ocioso sem publicação é desconhecido, não calmo', () => {
    const s = summarizeCamera(cam('cam', [proc('a', 'healthy')], [cons('a', 'idle')], 0));
    expect(s.pressure).toBe('unknown');
  });

  it('F5/F6 — baldes fecham e a ordem põe o pior primeiro', () => {
    const view = summarizeFleet([
      cam('cam-z', [proc('a', 'healthy')], [cons('a', 'flowing')]),
      cam('cam-a', [proc('a', 'quarantined')], [cons('a', 'flowing')]),
      cam('cam-m', [], [cons('a', 'flowing')]),
    ]);
    expect(view.total).toBe(3);
    expect(
      view.buckets.healthy +
        view.buckets.unknown +
        view.buckets.degraded +
        view.buckets.probation +
        view.buckets.quarantined
    ).toBe(3);
    expect(view.cameras.map((c) => c.cameraId)).toEqual(['cam-a', 'cam-m', 'cam-z']);
    expect(view.worstHealth).toBe('quarantined');
    expect(view.actionableCount).toBe(2);
  });

  it('frota vazia não é apresentada como saudável', () => {
    const view = summarizeFleet([]);
    expect(view.worstHealth).toBe('unknown');
    expect(view.headline).toBe('Nenhuma câmera observada');
  });

  it('worstHealth trata desconhecido como pior que saudável', () => {
    expect(worstHealth('healthy', 'unknown')).toBe('unknown');
    expect(worstHealth('unknown', 'degraded')).toBe('degraded');
  });
});
