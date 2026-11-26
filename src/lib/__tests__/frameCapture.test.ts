import { describe, it, expect } from 'vitest';
import {
  captureFrameToDataUrl,
  ANALYSIS_FRAME_MAX_HEIGHT,
  ANALYSIS_FRAME_MAX_WIDTH,
  ANALYSIS_FRAME_QUALITY,
} from '@/lib/frameCapture';
import { buildFrameMaskPlan, type FrameMaskSource } from '@/lib/motionMaskRedaction';

type Op = { op: string; args: unknown[] };

/** Olha o destino de cada captura: o quadro da IA sai redigido, o do replay não. */
function fakeCanvas(width = 0, height = 0) {
  const ops: Op[] = [];
  const record =
    (op: string) =>
    (...args: unknown[]) => {
      ops.push({ op, args });
    };
  const ctx = {
    fillStyle: '',
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    closePath: record('closePath'),
    fill: record('fill'),
    fillRect: record('fillRect'),
    save: record('save'),
    restore: record('restore'),
    clip: record('clip'),
    drawImage: record('drawImage'),
  };
  const toDataUrlCalls: unknown[][] = [];
  const canvas = {
    width,
    height,
    getContext: (id: string) => (id === '2d' ? ctx : null),
    toDataURL: (...args: unknown[]) => {
      toDataUrlCalls.push(args);
      return 'data:image/jpeg;base64,QUADRO';
    },
  };
  return {
    canvas: canvas as unknown as HTMLCanvasElement,
    backing: canvas,
    ops,
    toDataUrlCalls,
  };
}

function fakeVideo(overrides: Partial<HTMLVideoElement> = {}) {
  const video = { readyState: 2, videoWidth: 1280, videoHeight: 720, ...overrides };
  return video as unknown as HTMLVideoElement;
}

const triangle: [number, number][] = [
  [0, 0],
  [0.5, 0],
  [0.5, 0.5],
];
function maskSource(overrides: Partial<FrameMaskSource> = {}): FrameMaskSource {
  return { mode: 'exclude', polygon: triangle, enabled: true, ...overrides };
}

describe('captureFrameToDataUrl', () => {
  it('no destino replay desenha o quadro original, sem pintar máscara', () => {
    const { canvas, backing, ops, toDataUrlCalls } = fakeCanvas();
    const plan = buildFrameMaskPlan([maskSource()]);

    const dataUrl = captureFrameToDataUrl(fakeVideo(), canvas, plan, 'replay');

    expect(dataUrl).toBe('data:image/jpeg;base64,QUADRO');
    expect(ops).toEqual([{ op: 'drawImage', args: [expect.anything(), 0, 0, 640, 480] }]);
    expect(backing.width).toBe(ANALYSIS_FRAME_MAX_WIDTH);
    expect(backing.height).toBe(ANALYSIS_FRAME_MAX_HEIGHT);
    expect(toDataUrlCalls).toEqual([['image/jpeg', ANALYSIS_FRAME_QUALITY]]);
  });

  it('no destino analysis o exclude pinta a área mascarada por cima do quadro', () => {
    const { canvas, ops } = fakeCanvas();
    const plan = buildFrameMaskPlan([maskSource()]);

    captureFrameToDataUrl(fakeVideo(), canvas, plan, 'analysis');

    const drawImageAt = ops.findIndex((o) => o.op === 'drawImage');
    const fillAt = ops.findIndex((o) => o.op === 'fill');
    expect(drawImageAt).toBe(0);
    // o quadrado do exclude só fica preto porque o fill vem depois do desenho
    expect(fillAt).toBeGreaterThan(drawImageAt);
    expect(ops[ops.length - 1]?.op).toBe('fill');
  });

  it('no destino analysis o include redige tudo e desenha só o interior', () => {
    const { canvas, ops } = fakeCanvas();
    const plan = buildFrameMaskPlan([maskSource({ mode: 'include' })]);

    captureFrameToDataUrl(fakeVideo(), canvas, plan, 'analysis');

    expect(ops[0]).toEqual({ op: 'fillRect', args: [0, 0, 640, 480] });
    expect(ops.map((o) => o.op)).toContain('clip');
    expect(ops.find((o) => o.op === 'drawImage')?.args).toEqual([
      expect.anything(),
      0,
      0,
      640,
      480,
    ]);
  });

  it('sem máscara habilitada os dois destinos produzem a mesma captura', () => {
    const plan = buildFrameMaskPlan([maskSource({ enabled: false })]);
    const replay = fakeCanvas();
    const analysis = fakeCanvas();

    captureFrameToDataUrl(fakeVideo(), replay.canvas, plan, 'replay');
    captureFrameToDataUrl(fakeVideo(), analysis.canvas, plan, 'analysis');

    expect(analysis.ops).toEqual(replay.ops);
    expect(analysis.ops.map((o) => o.op)).toEqual(['drawImage']);
  });

  it('devolve null sem vídeo pronto (readyState < 2)', () => {
    const { canvas, ops } = fakeCanvas();
    expect(
      captureFrameToDataUrl(
        fakeVideo({ readyState: 1 }),
        canvas,
        buildFrameMaskPlan([]),
        'analysis'
      )
    ).toBeNull();
    expect(captureFrameToDataUrl(null, canvas, buildFrameMaskPlan([]), 'replay')).toBeNull();
    expect(ops).toHaveLength(0);
  });

  it('não corta além do tamanho do vídeo quando ele é menor que a caixa da IA', () => {
    const { canvas, backing } = fakeCanvas();
    captureFrameToDataUrl(
      fakeVideo({ videoWidth: 320, videoHeight: 240 }),
      canvas,
      buildFrameMaskPlan([]),
      'replay'
    );
    expect(backing.width).toBe(320);
    expect(backing.height).toBe(240);
  });
});
