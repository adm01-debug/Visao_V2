import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VisionPipelineFleetCard } from '../VisionPipelineFleetCard';
import type { BusView, ConsumerHealth, ConsumerView } from '@/lib/vision/frameBus';
import type { PipelineView, ProcessorHealth, ProcessorView } from '@/lib/vision/visionPipeline';
import type { CameraPipelineInput } from '@/lib/vision/pipelineFleet';

function proc(health: ProcessorHealth, succeeded = 3, failed = 1): ProcessorView {
  return {
    processorId: 'p',
    capabilities: ['track'],
    health,
    stats: { admitted: succeeded + failed, succeeded, failed, late: 0, refused: 0 },
    successRatio: succeeded / (succeeded + failed),
  };
}

function cons(health: ConsumerHealth): ConsumerView {
  return {
    consumerId: 'p',
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
  consumerHealth: ConsumerHealth
): CameraPipelineInput {
  const pipeline: PipelineView = {
    cameraId,
    processors,
    degraded: processors.some((p) => p.health !== 'healthy'),
  };
  const bus: BusView = {
    cameraId,
    publishedFrames: 12,
    droppedOutOfOrder: 0,
    consumers: [cons(consumerHealth)],
  };
  return { pipeline, bus };
}

describe('VisionPipelineFleetCard', () => {
  it('declara ausência em vez de fingir saúde', () => {
    render(<VisionPipelineFleetCard inputs={[]} />);
    expect(screen.getByText('Nenhuma câmera observada')).toBeInTheDocument();
    expect(screen.getByText('Nenhum pipeline ativo neste momento.')).toBeInTheDocument();
  });

  it('mostra o pior primeiro e nomeia o processador suspenso', () => {
    render(
      <VisionPipelineFleetCard
        inputs={[
          cam('cam-boa', [proc('healthy')], 'flowing'),
          cam('cam-ruim', [proc('quarantined')], 'flowing'),
        ]}
      />
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('cam-ruim');
    expect(items[0]).toHaveTextContent('Suspenso');
    expect(items[1]).toHaveTextContent('cam-boa');
  });

  it('separa pressão de barramento da saúde do processador', () => {
    render(<VisionPipelineFleetCard inputs={[cam('cam-1', [proc('healthy')], 'starved')]} />);
    expect(screen.getByText('Saudável')).toBeInTheDocument();
    expect(screen.getByText(/Sem entrega/)).toBeInTheDocument();
  });

  it('não apresenta confiabilidade quando não houve desfecho', () => {
    render(<VisionPipelineFleetCard inputs={[cam('cam-1', [proc('healthy', 0, 0)], 'flowing')]} />);
    expect(screen.getByText('sem desfecho')).toBeInTheDocument();
  });
});
