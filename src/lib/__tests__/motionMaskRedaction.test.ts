import { describe, it, expect } from 'vitest';
import {
  buildFrameMaskPlan,
  hasMaskRedaction,
  paintFrameMask,
  toCanvasPoints,
  type FrameMaskSource,
} from '@/lib/motionMaskRedaction';

type Op = { op: string; args: unknown[]; fillStyle?: string };

/** Canvas de mentira que grava as operações, para provar a ordem e a geometria. */
function createRecordingContext() {
  const ops: Op[] = [];
  const state: { fillStyle: string } = { fillStyle: '' };
  const record =
    (op: string) =>
    (...args: unknown[]) => {
      ops.push({ op, args, fillStyle: state.fillStyle });
    };
  const ctx = {
    get fillStyle() {
      return state.fillStyle;
    },
    set fillStyle(value: string) {
      state.fillStyle = value;
    },
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
  return { ctx: ctx as unknown as CanvasRenderingContext2D, ops };
}

const video = {} as CanvasImageSource;
const triangle: [number, number][] = [
  [0, 0],
  [0.5, 0],
  [0.5, 0.5],
];

function mask(overrides: Partial<FrameMaskSource> = {}): FrameMaskSource {
  return { mode: 'exclude', polygon: triangle, enabled: true, ...overrides };
}

describe('buildFrameMaskPlan', () => {
  it('ignora máscaras desabilitadas', () => {
    const plan = buildFrameMaskPlan([mask({ enabled: false })]);
    expect(plan.excludePolygons).toHaveLength(0);
    expect(hasMaskRedaction(plan)).toBe(false);
  });

  it('ignora polígonos com menos de 3 pontos', () => {
    const plan = buildFrameMaskPlan([
      mask({
        polygon: [
          [0, 0],
          [1, 1],
        ],
      }),
    ]);
    expect(plan.excludePolygons).toHaveLength(0);
  });

  it('separa include de exclude', () => {
    const plan = buildFrameMaskPlan([mask({ mode: 'include' }), mask({ mode: 'exclude' })]);
    expect(plan.includePolygons).toHaveLength(1);
    expect(plan.excludePolygons).toHaveLength(1);
    expect(hasMaskRedaction(plan)).toBe(true);
  });
});

describe('toCanvasPoints', () => {
  it('converte coordenadas normalizadas para pixels do canvas', () => {
    expect(
      toCanvasPoints(
        [
          [0.25, 0.5],
          [1, 1],
        ],
        640,
        480
      )
    ).toEqual([
      [160, 240],
      [640, 480],
    ]);
  });
});

describe('paintFrameMask', () => {
  it('sem máscara habilitada desenha o quadro inteiro e não pinta nada', () => {
    const { ctx, ops } = createRecordingContext();
    paintFrameMask(ctx, buildFrameMaskPlan([]), video, 640, 480);

    expect(ops.map((o) => o.op)).toEqual(['drawImage']);
    expect(ops[0].args).toEqual([video, 0, 0, 640, 480]);
  });

  it('exclude pinta a área mascarada depois de desenhar o quadro', () => {
    const { ctx, ops } = createRecordingContext();
    paintFrameMask(ctx, buildFrameMaskPlan([mask()]), video, 640, 480);

    expect(ops.map((o) => o.op)).toEqual([
      'drawImage',
      'beginPath',
      'moveTo',
      'lineTo',
      'lineTo',
      'closePath',
      'fill',
    ]);
    const fill = ops.filter((o) => o.op === 'fill');
    expect(fill).toHaveLength(1);
    expect(fill[0].fillStyle).toBe('#000000');
    // polígono normalizado 0..0.5 vira 0..320 px em 640
    const lineTo = ops.filter((o) => o.op === 'lineTo');
    expect(lineTo.map((o) => o.args)).toEqual([
      [320, 0],
      [320, 240],
    ]);
  });

  it('include redige o quadro inteiro e desenha só o interior do polígono', () => {
    const { ctx, ops } = createRecordingContext();
    paintFrameMask(ctx, buildFrameMaskPlan([mask({ mode: 'include' })]), video, 640, 480);

    expect(ops[0].op).toBe('fillRect');
    expect(ops[0].args).toEqual([0, 0, 640, 480]);
    expect(ops[0].fillStyle).toBe('#000000');
    expect(ops.filter((o) => o.op === 'clip')).toHaveLength(1);
    expect(ops.filter((o) => o.op === 'drawImage')).toHaveLength(1);
    expect(ops.filter((o) => o.op === 'save')).toHaveLength(1);
    expect(ops.filter((o) => o.op === 'restore')).toHaveLength(1);
    expect(ops.filter((o) => o.op === 'fill')).toHaveLength(0);
  });

  it('exclude sobreposto ao include prevalece, na ordem e na geometria em pixels', () => {
    const { ctx, ops } = createRecordingContext();
    const plan = buildFrameMaskPlan([
      mask({ mode: 'include' }),
      mask({
        mode: 'exclude',
        polygon: [
          [0.25, 0.25],
          [0.5, 0.25],
          [0.5, 0.5],
        ],
      }),
    ]);
    paintFrameMask(ctx, plan, video, 640, 480);

    // sequência completa: quadro redigido -> só o interior do include desenhado
    // (0,0)/(320,0)/(320,240) -> exclude pintado por cima, em (160,120)/(320,120)/(320,240)
    expect(ops.map((o) => [o.op, o.args])).toEqual([
      ['fillRect', [0, 0, 640, 480]],
      ['save', []],
      ['beginPath', []],
      ['moveTo', [0, 0]],
      ['lineTo', [320, 0]],
      ['lineTo', [320, 240]],
      ['closePath', []],
      ['clip', []],
      ['drawImage', [video, 0, 0, 640, 480]],
      ['restore', []],
      ['beginPath', []],
      ['moveTo', [160, 120]],
      ['lineTo', [320, 120]],
      ['lineTo', [320, 240]],
      ['closePath', []],
      ['fill', []],
    ]);
    expect(ops.filter((o) => o.op === 'fill')[0].fillStyle).toBe('#000000');
  });
});
