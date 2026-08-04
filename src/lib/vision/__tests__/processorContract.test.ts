/**
 * Onda 213 — testes do contrato de entrada/saída do `VisionProcessor`.
 *
 * Fixam os comportamentos que já custaram caro em ondas anteriores: silêncio
 * virando sucesso, laudo de outro frame virando overlay, LLM virando prova.
 */

import { describe, it, expect } from 'vitest';
import {
  adaptProcessor,
  auditOutput,
  buildProcessorInput,
  normalizeProcessorOutput,
  ProcessorContractError,
  DEFAULT_DEADLINES_MS,
} from '@/lib/vision/processorContract';
import type { PipelineTask, ProcessorCapability } from '@/lib/vision/visionPipeline';

function task(kind: ProcessorCapability, frameId = 1): PipelineTask {
  return {
    processorId: 'proc-1',
    kind,
    frameId,
    capturedAtMs: 1_000,
    trackId: kind === 'identify' ? 'trk-1' : null,
  };
}

const input = buildProcessorInput('cam-1', task('identify'), 10_000);

describe('processorContract — entrada', () => {
  it('C1 deriva prazo do modo autorizado, nunca do processador', () => {
    const trackInput = buildProcessorInput('cam-1', task('track'), 10_000);
    expect(trackInput.deadlineMs).toBe(10_000 + DEFAULT_DEADLINES_MS.track);
    expect(input.deadlineMs).toBe(10_000 + DEFAULT_DEADLINES_MS.identify);
    expect(trackInput.capability).toBe('track');
  });
});

describe('processorContract — saída', () => {
  it('C2 trata laudo malformado como falha, nunca como sucesso silencioso', () => {
    for (const raw of [null, undefined, 42, 'ok', { status: 'talvez' }]) {
      const output = normalizeProcessorOutput(input, raw);
      expect(output.verdict).toBe('rejected');
      expect(output.rejection).toBe('malformed_output');
      expect(output.healthy).toBe(false);
    }
  });

  it('C3 rejeita laudo de outro frame mesmo estando perfeito', () => {
    const output = normalizeProcessorOutput(input, {
      status: 'ok',
      frameId: input.frameId + 1,
      producedAtMs: 10_010,
      detections: [{ id: 'a', kind: 'face', confidence: 1, provenance: ['human'] }],
    });
    expect(output.rejection).toBe('foreign_frame');
    expect(output.detections).toHaveLength(0);
  });

  it('C4 conta laudo vazio como execução saudável', () => {
    const output = normalizeProcessorOutput(input, {
      status: 'no_result',
      frameId: input.frameId,
      producedAtMs: 10_010,
    });
    expect(output.verdict).toBe('empty');
    expect(output.healthy).toBe(true);
  });

  it('C5 derruba confiança inválida em vez de clampar', () => {
    const output = normalizeProcessorOutput(input, {
      status: 'ok',
      frameId: input.frameId,
      producedAtMs: 10_010,
      detections: [
        { id: 'a', kind: 'face', confidence: Number.NaN, provenance: ['model'] },
        { id: 'b', kind: 'face', confidence: 1.4, provenance: ['model'] },
        { id: 'c', kind: 'face', confidence: 0.8, provenance: ['model'] },
      ],
    });
    expect(output.rejectionCounts.invalid_confidence).toBe(2);
    expect(output.detections.map((d) => d.id)).toEqual(['c']);
  });

  it('C6 barra identificação vinda de tarefa de rastreio', () => {
    const trackInput = buildProcessorInput('cam-1', task('track'), 10_000);
    const output = normalizeProcessorOutput(trackInput, {
      status: 'ok',
      frameId: trackInput.frameId,
      producedAtMs: 10_010,
      detections: [
        { id: 'a', kind: 'face', confidence: 0.99, provenance: ['sensor'], identifies: true },
      ],
    });
    expect(output.rejectionCounts.capability_overreach).toBe(1);
    expect(output.detections).toHaveLength(0);
    expect(output.healthy).toBe(true);
  });

  it('C7 nunca promove origem generativa, mesmo com confiança 1', () => {
    const output = normalizeProcessorOutput(input, {
      status: 'ok',
      frameId: input.frameId,
      producedAtMs: 10_010,
      detections: [
        { id: 'a', kind: 'plate', confidence: 1, provenance: ['llm'] },
        { id: 'b', kind: 'plate', confidence: 1, provenance: ['sensor', 'llm'] },
        { id: 'c', kind: 'plate', confidence: 1 },
      ],
    });
    expect(output.detections.map((d) => d.provenance)).toEqual(['llm', 'llm', 'unknown']);
    expect(output.detections.every((d) => d.standing === 'investigative')).toBe(true);
  });

  it('C8 descarta laudo vencido e contabiliza cada detecção perdida', () => {
    const output = normalizeProcessorOutput(input, {
      status: 'ok',
      frameId: input.frameId,
      producedAtMs: input.deadlineMs + 1,
      detections: [
        { id: 'a', kind: 'face', confidence: 0.9, provenance: ['human'] },
        { id: 'b', kind: 'face', confidence: 0.9, provenance: ['human'] },
      ],
    });
    expect(output.rejection).toBe('timed_out');
    expect(output.rejectionCounts.expired).toBe(2);
    expect(output.detections).toHaveLength(0);
    expect(auditOutput(output)).toEqual([]);
  });

  it('C9 fecha a contabilidade entre aceitas, rejeitadas e afirmadas', () => {
    const output = normalizeProcessorOutput(input, {
      status: 'ok',
      frameId: input.frameId,
      producedAtMs: 10_010,
      detections: [
        { id: 'a', kind: 'face', confidence: 0.9, provenance: ['human'] },
        { id: 'a', kind: 'face', confidence: 0.1, provenance: ['human'] },
        null,
        { id: 'd', kind: 'face', confidence: 2, provenance: ['human'] },
      ],
    });
    expect(output.claimedDetections).toBe(4);
    expect(output.detections.length + output.rejectedDetections.length).toBe(4);
    expect(auditOutput(output)).toEqual([]);
  });
});

describe('processorContract — ponte com o ciclo', () => {
  const clock = () => 20_000;

  it('traduz exceção do processador em erro de contrato com laudo no sink', async () => {
    const seen: string[] = [];
    const run = adaptProcessor(
      () => {
        throw new Error('cuda oom');
      },
      { cameraId: 'cam-1', clock, sink: (o) => seen.push(o.reason ?? '') }
    );
    await expect(run(task('identify'))).rejects.toBeInstanceOf(ProcessorContractError);
    expect(seen).toEqual(['cuda oom']);
  });

  it('não lança quando o processador responde honestamente que nada achou', async () => {
    const run = adaptProcessor(
      (i) => ({ status: 'no_result' as const, frameId: i.frameId, producedAtMs: 20_001 }),
      { cameraId: 'cam-1', clock }
    );
    await expect(run(task('track'))).resolves.toBeUndefined();
  });
});
