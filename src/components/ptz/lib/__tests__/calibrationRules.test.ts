import { describe, it, expect } from 'vitest';
import {
  RECAPTURE_THRESHOLD_PCT,
  computeRecaptureRequired,
  hasAnyRecaptureRequired,
  validateObservedRange,
} from '../calibrationRules';

describe('computeRecaptureRequired', () => {
  it('retorna todos false quando validation está vazia', () => {
    expect(computeRecaptureRequired({})).toEqual({
      pan: false,
      tilt: false,
      zoom: false,
    });
  });

  it('não marca eixo quando error_pct é exatamente o limiar (comparação estrita)', () => {
    const r = computeRecaptureRequired({
      pan: { error_pct: RECAPTURE_THRESHOLD_PCT },
    });
    expect(r.pan).toBe(false);
  });

  it('marca eixo quando error_pct excede o limiar', () => {
    const r = computeRecaptureRequired({
      pan: { error_pct: RECAPTURE_THRESHOLD_PCT + 0.01 },
    });
    expect(r).toEqual({ pan: true, tilt: false, zoom: false });
  });

  it('marca somente os eixos acima do limiar independentemente uns dos outros', () => {
    const r = computeRecaptureRequired({
      pan: { error_pct: 3 },
      tilt: { error_pct: 25 },
      zoom: { error_pct: 11 },
    });
    expect(r).toEqual({ pan: false, tilt: true, zoom: true });
  });

  it('ignora eixos sem entrada na validation (undefined ≠ 0)', () => {
    const r = computeRecaptureRequired({ zoom: { error_pct: 42 } });
    expect(r).toEqual({ pan: false, tilt: false, zoom: true });
  });

  it('respeita o limiar customizado quando fornecido', () => {
    const r = computeRecaptureRequired(
      { pan: { error_pct: 6 } },
      5,
    );
    expect(r.pan).toBe(true);
  });

  it('trata error_pct = 0 como não-recapturável', () => {
    const r = computeRecaptureRequired({
      pan: { error_pct: 0 },
      tilt: { error_pct: 0 },
      zoom: { error_pct: 0 },
    });
    expect(hasAnyRecaptureRequired(r)).toBe(false);
  });
});

describe('hasAnyRecaptureRequired', () => {
  it('retorna false quando nenhum eixo está marcado', () => {
    expect(
      hasAnyRecaptureRequired({ pan: false, tilt: false, zoom: false }),
    ).toBe(false);
  });

  it.each(['pan', 'tilt', 'zoom'] as const)(
    'retorna true quando apenas %s está marcado',
    (axis) => {
      const base = { pan: false, tilt: false, zoom: false };
      expect(hasAnyRecaptureRequired({ ...base, [axis]: true })).toBe(true);
    },
  );
});

describe('validateObservedRange', () => {
  const bounds: [number, number] = [-180, 180];

  it('aceita range válido dentro dos limites', () => {
    expect(validateObservedRange(-90, 90, bounds)).toEqual({ ok: true });
  });

  it('aceita range que toca exatamente os limites físicos', () => {
    expect(validateObservedRange(-180, 180, bounds)).toEqual({ ok: true });
  });

  it('rejeita quando min = max (min ≥ max)', () => {
    expect(validateObservedRange(10, 10, bounds)).toEqual({
      ok: false,
      error: 'min_ge_max',
    });
  });

  it('rejeita quando min > max', () => {
    expect(validateObservedRange(50, -50, bounds)).toEqual({
      ok: false,
      error: 'min_ge_max',
    });
  });

  it('rejeita min abaixo do limite inferior', () => {
    expect(validateObservedRange(-200, 90, bounds)).toEqual({
      ok: false,
      error: 'out_of_bounds',
    });
  });

  it('rejeita max acima do limite superior', () => {
    expect(validateObservedRange(-90, 200, bounds)).toEqual({
      ok: false,
      error: 'out_of_bounds',
    });
  });

  it.each([
    ['NaN min', NaN, 10],
    ['NaN max', -10, NaN],
    ['Infinity min', -Infinity, 10],
    ['Infinity max', -10, Infinity],
  ])('rejeita valores não-finitos (%s)', (_label, min, max) => {
    expect(validateObservedRange(min, max, bounds)).toEqual({
      ok: false,
      error: 'not_finite',
    });
  });

  it('prioriza not_finite sobre out_of_bounds e min_ge_max', () => {
    expect(validateObservedRange(NaN, NaN, bounds).error).toBe('not_finite');
  });

  it('prioriza out_of_bounds sobre min_ge_max quando ambos falham', () => {
    // min=500 (>hi) e min>max — o guard de bounds deve disparar primeiro.
    expect(validateObservedRange(500, 400, bounds).error).toBe(
      'out_of_bounds',
    );
  });

  it('funciona com bounds de zoom [0, 1]', () => {
    expect(validateObservedRange(0.1, 0.9, [0, 1])).toEqual({ ok: true });
    expect(validateObservedRange(-0.01, 0.9, [0, 1]).error).toBe(
      'out_of_bounds',
    );
    expect(validateObservedRange(0.9, 0.9, [0, 1]).error).toBe('min_ge_max');
  });
});
