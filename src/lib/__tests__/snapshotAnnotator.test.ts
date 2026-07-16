import { describe, it, expect, vi } from 'vitest';
import {
  annotateFrame,
  clampBox,
  resolveBoxColor,
  type DetectionBox,
} from '@/lib/snapshotAnnotator';

function makeCtx() {
  const calls: string[] = [];
  const ctx = {
    lineWidth: 0,
    strokeStyle: '',
    fillStyle: '',
    font: '',
    globalAlpha: 1,
    textBaseline: '',
    strokeRect: vi.fn((x, y, w, h) => calls.push(`stroke:${x},${y},${w},${h}`)),
    fillRect: vi.fn((x, y, w, h) => calls.push(`fill:${x},${y},${w},${h}`)),
    fillText: vi.fn((t, x, y) => calls.push(`text:${t}@${x},${y}`)),
    measureText: vi.fn((t: string) => ({ width: t.length * 7 })),
  } as unknown as CanvasRenderingContext2D & { strokeRect: ReturnType<typeof vi.fn> };
  return { ctx, calls };
}

describe('snapshotAnnotator', () => {
  it('resolveBoxColor retorna cor determinística por classe', () => {
    expect(resolveBoxColor('plate')).toContain('hsl');
    expect(resolveBoxColor('plate')).toBe(resolveBoxColor('plate'));
    expect(resolveBoxColor()).toBe(resolveBoxColor('other'));
    expect(resolveBoxColor('person', 'hsl(1,1%,1%)')).toBe('hsl(1,1%,1%)');
  });

  it('clampBox normaliza box invertido e clampa ao frame', () => {
    const clamped = clampBox({ x: -10, y: -10, w: 50, h: 50 }, { width: 100, height: 100 });
    expect(clamped).toEqual(expect.objectContaining({ x: 0, y: 0, w: 40, h: 40 }));

    const inverted = clampBox({ x: 50, y: 50, w: -20, h: -20 }, { width: 100, height: 100 });
    expect(inverted).toEqual(expect.objectContaining({ x: 30, y: 30, w: 20, h: 20 }));
  });

  it('clampBox retorna null para box zero-área ou fora do frame', () => {
    expect(clampBox({ x: 0, y: 0, w: 0, h: 10 }, { width: 100, height: 100 })).toBeNull();
    expect(clampBox({ x: 200, y: 200, w: 10, h: 10 }, { width: 100, height: 100 })).toBeNull();
    expect(clampBox({ x: NaN, y: 0, w: 10, h: 10 }, { width: 100, height: 100 })).toBeNull();
  });

  it('annotateFrame desenha box + label e ignora inválidos', () => {
    const { ctx, calls } = makeCtx();
    const dets: DetectionBox[] = [
      { x: 10, y: 10, w: 50, h: 50, label: 'car', score: 0.87, objectClass: 'vehicle' },
      { x: 0, y: 0, w: 0, h: 0 }, // ignorado
    ];
    const drawn = annotateFrame(ctx, { width: 200, height: 200 }, dets);
    expect(drawn).toBe(1);
    expect(calls.some((c) => c.startsWith('stroke:10,10,50,50'))).toBe(true);
    expect(calls.some((c) => c.startsWith('text:car 87%'))).toBe(true);
  });

  it('annotateFrame desenha múltiplos boxes na ordem', () => {
    const { ctx } = makeCtx();
    const dets: DetectionBox[] = Array.from({ length: 5 }, (_, i) => ({
      x: i * 10, y: 0, w: 8, h: 8, objectClass: 'person',
    }));
    expect(annotateFrame(ctx, { width: 100, height: 100 }, dets)).toBe(5);
  });

  it('annotateFrame respeita showScore=false', () => {
    const { ctx, calls } = makeCtx();
    annotateFrame(ctx, { width: 100, height: 100 }, [
      { x: 5, y: 5, w: 20, h: 20, label: 'x', score: 0.5, objectClass: 'person' },
    ], { showScore: false });
    expect(calls.some((c) => c.includes('50%'))).toBe(false);
  });

  it('annotateFrame reposiciona label quando não cabe acima', () => {
    const { ctx, calls } = makeCtx();
    annotateFrame(ctx, { width: 200, height: 200 }, [
      { x: 10, y: 0, w: 50, h: 50, label: 'top', objectClass: 'face' },
    ]);
    // label deve ficar dentro do frame (y >= 0)
    const textCall = calls.find((c) => c.startsWith('text:top'));
    expect(textCall).toBeDefined();
    const y = Number(textCall!.split('@')[1].split(',')[1]);
    expect(y).toBeGreaterThanOrEqual(0);
  });
});
