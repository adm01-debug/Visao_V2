/**
 * Onda 214 — testes dos adaptadores reais (face / ALPR / heatmap).
 *
 * Fixam a escada de fallback: indisponível ≠ vazio, travado ≠ pendurado,
 * degradado ≠ silencioso, LLM ≠ prova.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildProcessorRegistry,
  createFaceRun,
  createHeatRun,
  createPlateRun,
  FACE_PROCESSOR,
  HEAT_PROCESSOR,
  PLATE_PROCESSOR,
  type AdapterDeps,
} from '@/lib/vision/processors';
import {
  BackendUnavailableError,
  type FaceBackend,
  type HeatBackend,
  type PlateBackend,
} from '@/lib/vision/processors/backends';
import {
  buildProcessorInput,
  normalizeProcessorOutput,
  type NormalizedOutput,
} from '@/lib/vision/processorContract';
import type { PipelineTask, ProcessorCapability } from '@/lib/vision/visionPipeline';

const FRAME = { frameId: 1, image: null, width: 640, height: 480 };

function deps(overrides: Partial<AdapterDeps> = {}): AdapterDeps {
  return {
    clock: () => 1_000,
    resolveFrame: () => FRAME,
    /* Timer que nunca dispara = prazo folgado. O teste de estouro injeta um
     * timer imediato de propósito; deixar o padrão imediato faria toda chamada
     * "vencer o prazo" só porque o backend usa um microtask a mais. */
    timer: () => new Promise<void>(() => {}),
    ...overrides,
  };
}

function task(kind: ProcessorCapability, processorId = 'face'): PipelineTask {
  return {
    processorId,
    kind,
    frameId: 1,
    capturedAtMs: 900,
    trackId: kind === 'identify' ? 'trk-1' : null,
  };
}

async function normalize(
  run: ReturnType<typeof createFaceRun>,
  kind: ProcessorCapability,
  processorId = 'face',
  clockValue = 1_000,
): Promise<NormalizedOutput> {
  const input = buildProcessorInput('cam-1', task(kind, processorId), clockValue);
  return normalizeProcessorOutput(input, await run(input));
}

const sane: FaceBackend = {
  modelId: 'arcface',
  detect: async () => [
    { id: 'f1', box: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 }, score: 0.8 },
    { id: 'f2', box: { x: 0.5, y: 0.5, w: 0.2, h: 0.2 }, score: 0.8, spoofSuspect: true },
  ],
  match: async (detections) =>
    detections.map((d) => ({
      detectionId: d.id,
      personId: 'p1',
      personLabel: 'Fulano',
      similarity: 0.95,
    })),
};

describe('adaptador de face', () => {
  it('A1 trata backend indisponível como falha declarada, nunca como cena vazia', async () => {
    const run = createFaceRun(
      {
        modelId: 'arcface',
        detect: async () => {
          throw new BackendUnavailableError('face', 'webgl_lost');
        },
      },
      deps(),
    );
    const output = await normalize(run, 'identify');
    expect(output.verdict).toBe('rejected');
    expect(output.healthy).toBe(false);
    expect(output.reason).toContain('webgl_lost');
  });

  it('A2 aborta o backend travado no prazo em vez de segurar o slot', async () => {
    const abortSpy = vi.fn();
    const run = createFaceRun(
      {
        modelId: 'arcface',
        detect: async (_frame, signal) => {
          signal.addEventListener('abort', abortSpy);
          return new Promise(() => {});
        },
      },
      deps({ timer: async () => {} }),
    );
    const output = await normalize(run, 'identify');
    expect(output.verdict).toBe('rejected');
    expect(output.reason).toBe('deadline_exceeded');
    expect(abortSpy).toHaveBeenCalled();
  });

  it('A3 degrada para rastreio e reporta quando não há comparador', async () => {
    const onDegrade = vi.fn();
    const run = createFaceRun(
      { modelId: 'arcface', detect: sane.detect },
      deps({ onDegrade }),
    );
    const output = await normalize(run, 'identify');
    expect(onDegrade).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'identify', to: 'track', reason: 'match_backend_missing' }),
    );
    expect(output.detections.every((d) => !d.identifies)).toBe(true);
    expect(output.healthy).toBe(true);
  });

  it('A4 nunca rotula rosto suspeito de spoof, mesmo com similaridade 0,95', async () => {
    const run = createFaceRun(sane, deps());
    const output = await normalize(run, 'identify');
    const spoof = output.detections.find((d) => d.kind === 'face_spoof_suspect');
    expect(spoof?.identifies).toBe(false);
    expect(spoof?.label).toBeNull();
    expect(output.detections.find((d) => d.kind === 'face')?.identifies).toBe(true);
  });

  it('A1 falha quando o frame já foi reciclado pelo barramento', async () => {
    const run = createFaceRun(sane, deps({ resolveFrame: () => null }));
    const output = await normalize(run, 'track');
    expect(output.reason).toBe('frame_unavailable');
    expect(output.verdict).toBe('rejected');
  });
});

const plates: PlateBackend = {
  modelId: 'alpr',
  detect: async () => [
    { id: 'dev', box: { x: 0, y: 0, w: 0.1, h: 0.1 }, text: 'ABC1D23', confidence: 0.93, reader: 'device' },
    { id: 'ocr', box: { x: 0.2, y: 0, w: 0.1, h: 0.1 }, text: 'XYZ9K88', confidence: 0.8, reader: 'ocr' },
    { id: 'llm', box: { x: 0.4, y: 0, w: 0.1, h: 0.1 }, text: 'QWE4R56', confidence: 0.99, reader: 'llm' },
  ],
  resolve: async (reads) => reads.map((r) => ({ id: r.id, listLabel: 'Lista quente' })),
};

describe('adaptador de ALPR', () => {
  it('A5 mapeia a origem da leitura para a procedência correta', async () => {
    const run = createPlateRun(plates, deps());
    const output = await normalize(run, 'identify', 'alpr');
    const byId = new Map(output.detections.map((d) => [d.id, d]));
    expect(byId.get('dev')?.provenance).toBe('sensor');
    expect(byId.get('ocr')?.provenance).toBe('model');
    expect(byId.get('llm')?.provenance).toBe('llm');
  });

  it('A5 recusa que uma placa lida por LLM afirme pertencer à lista quente', async () => {
    const run = createPlateRun(plates, deps());
    const output = await normalize(run, 'identify', 'alpr');
    const llm = output.detections.find((d) => d.id === 'llm');
    expect(llm?.identifies).toBe(false);
    expect(llm?.standing).toBe('investigative');
    expect(output.detections.find((d) => d.id === 'dev')?.identifies).toBe(true);
  });
});

describe('adaptador de heatmap', () => {
  const heat: HeatBackend = {
    modelId: 'heat',
    columns: 4,
    rows: 4,
    accumulate: async () => [
      { index: 5, intensity: 0.9 },
      { index: 99, intensity: 0.5 },
      { index: 2, intensity: 1.7 },
    ],
  };

  it('descarta célula fora da grade e deixa o contrato barrar intensidade impossível', async () => {
    const run = createHeatRun(heat, deps());
    const output = await normalize(run, 'track', 'heatmap');
    expect(output.detections.map((d) => d.id)).toEqual(['cell-5']);
    expect(output.rejectionCounts.invalid_confidence).toBe(1);
    expect(output.detections[0]?.box).toEqual({ x: 0.25, y: 0.25, w: 0.25, h: 0.25 });
  });

  it('nunca declara capacidade de identificação', () => {
    expect(HEAT_PROCESSOR.capabilities).toEqual(['track']);
  });
});

describe('registro de executores', () => {
  it('declara só os processadores cujo backend existe', () => {
    const registry = buildProcessorRegistry(
      { face: sane },
      {
        cameraId: 'cam-1',
        clock: () => 1_000,
        resolveFrame: () => FRAME,
        timer: () => new Promise<void>(() => {}),
      },
    );
    expect(registry.processors.map((p) => p.id)).toEqual([FACE_PROCESSOR.id]);
    expect(Object.keys(registry.executors)).toEqual(['face']);
    expect(registry.executors[PLATE_PROCESSOR.id]).toBeUndefined();
  });

  it('isola a falha do backend: o executor rejeita, mas nunca vaza o erro cru', async () => {
    const sink = vi.fn();
    const registry = buildProcessorRegistry(
      {
        face: {
          modelId: 'arcface',
          detect: async () => {
            throw new Error('cuda oom\n  at kernel.cc:42');
          },
        },
      },
      {
        cameraId: 'cam-1',
        clock: () => 1_000,
        resolveFrame: () => FRAME,
        timer: () => new Promise<void>(() => {}),
        sink,
      },
    );
    await expect(registry.executors.face!(task('track'))).rejects.toThrow();
    const output = sink.mock.calls[0]![0] as NormalizedOutput;
    expect(output.reason).toContain('cuda oom');
    expect(output.reason).not.toContain('kernel.cc');
    expect(output.healthy).toBe(false);
  });
});
