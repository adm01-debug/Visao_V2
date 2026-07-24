/**
 * Testes de fronteira (boundary + arredondamento) para as regras puras
 * de calibração PTZ. Complementam `calibrationRules.test.ts` cobrindo:
 *
 *  - Vizinhança imediata do limiar de recaptura (ULP, half-even, floats).
 *  - Limiares customizados (0, negativos, fracionários e Infinity).
 *  - Valores especiais em `error_pct` (−0, subnormals, MAX_VALUE).
 *  - Fronteiras físicas em `validateObservedRange` incluindo diferença
 *    de um ULP e representação decimal imprecisa (0.1 + 0.2 vs 0.3).
 */
import { describe, it, expect } from 'vitest';
import {
  RECAPTURE_THRESHOLD_PCT,
  computeRecaptureRequired,
  validateObservedRange,
} from '../calibrationRules';

// Math.nextUp/nextDown em float64. Para positivos, o próximo double é
// obtido incrementando o bit pattern; para negativos, decrementando (bits
// caminham em direção ao zero conforme o valor cresce). Zeros ficam em
// ±MIN_VALUE.
const bumpBits = (x: number, dir: 1n | -1n): number => {
  if (Number.isNaN(x)) return NaN;
  if (x === 0) return dir === 1n ? Number.MIN_VALUE : -Number.MIN_VALUE;
  const buf = new ArrayBuffer(8);
  const f = new Float64Array(buf);
  const u = new BigUint64Array(buf);
  f[0] = x;
  // Bits do sinal positivo crescem com valor; do sinal negativo decrescem.
  const bitDir = x > 0 ? dir : -dir;
  u[0] = u[0] + bitDir;
  return f[0];
};
const ulpAbove = (x: number): number => bumpBits(x, 1n);
const ulpBelow = (x: number): number => bumpBits(x, -1n);

describe('computeRecaptureRequired — fronteira do limiar (default 10%)', () => {
  it('não marca no valor exato do limiar (10.0)', () => {
    expect(
      computeRecaptureRequired({ pan: { error_pct: 10 } }).pan,
    ).toBe(false);
  });

  it('não marca um ULP abaixo do limiar', () => {
    const below = ulpBelow(RECAPTURE_THRESHOLD_PCT);
    expect(below).toBeLessThan(RECAPTURE_THRESHOLD_PCT);
    expect(
      computeRecaptureRequired({ pan: { error_pct: below } }).pan,
    ).toBe(false);
  });

  it('marca um ULP acima do limiar (menor diferença representável em float64)', () => {
    const above = ulpAbove(RECAPTURE_THRESHOLD_PCT);
    expect(above).toBeGreaterThan(RECAPTURE_THRESHOLD_PCT);
    expect(
      computeRecaptureRequired({ pan: { error_pct: above } }).pan,
    ).toBe(true);
  });

  it('marca ao adicionar Number.EPSILON multiplicado pela magnitude', () => {
    const above = RECAPTURE_THRESHOLD_PCT + RECAPTURE_THRESHOLD_PCT * Number.EPSILON;
    // Em algumas plataformas 10 + 10*EPS pode arredondar para 10; se for
    // esse o caso, o comportamento correto é NÃO marcar (comparação estrita).
    const marked = computeRecaptureRequired({ pan: { error_pct: above } }).pan;
    expect(marked).toBe(above > RECAPTURE_THRESHOLD_PCT);
  });

  it('não marca no residual clássico de soma float 9.999...', () => {
    // 0.1 + 0.2 + ... até algo abaixo de 10 sem estourar.
    const sum = 0.1 + 0.2 + 9.7; // = 10.000000000000002 tipicamente
    if (sum > RECAPTURE_THRESHOLD_PCT) {
      expect(
        computeRecaptureRequired({ pan: { error_pct: sum } }).pan,
      ).toBe(true);
    } else {
      expect(
        computeRecaptureRequired({ pan: { error_pct: sum } }).pan,
      ).toBe(false);
    }
  });

  it('trata −0 como não-recapturável (−0 > 10 é false)', () => {
    const r = computeRecaptureRequired({ pan: { error_pct: -0 } });
    expect(r.pan).toBe(false);
  });

  it('trata valores negativos (erro impossível) como não-recapturável', () => {
    expect(
      computeRecaptureRequired({ pan: { error_pct: -50 } }).pan,
    ).toBe(false);
  });

  it('marca Number.MAX_VALUE', () => {
    expect(
      computeRecaptureRequired({ pan: { error_pct: Number.MAX_VALUE } }).pan,
    ).toBe(true);
  });

  it('marca +Infinity', () => {
    expect(
      computeRecaptureRequired({ pan: { error_pct: Number.POSITIVE_INFINITY } })
        .pan,
    ).toBe(true);
  });

  it('não marca NaN (NaN > x é sempre false)', () => {
    expect(
      computeRecaptureRequired({ pan: { error_pct: Number.NaN } }).pan,
    ).toBe(false);
  });

  it('trata Number.MIN_VALUE (subnormal positivo) como abaixo do limiar', () => {
    expect(
      computeRecaptureRequired({ pan: { error_pct: Number.MIN_VALUE } }).pan,
    ).toBe(false);
  });
});

describe('computeRecaptureRequired — limiares customizados', () => {
  it('threshold = 0 marca qualquer erro estritamente positivo', () => {
    const r = computeRecaptureRequired(
      {
        pan: { error_pct: Number.MIN_VALUE },
        tilt: { error_pct: 0 },
        zoom: { error_pct: -0 },
      },
      0,
    );
    expect(r).toEqual({ pan: true, tilt: false, zoom: false });
  });

  it('threshold negativo marca inclusive erro = 0', () => {
    const r = computeRecaptureRequired(
      { pan: { error_pct: 0 } },
      -0.0001,
    );
    expect(r.pan).toBe(true);
  });

  it('threshold fracionário (10.5) respeita fronteira estrita', () => {
    expect(
      computeRecaptureRequired({ pan: { error_pct: 10.5 } }, 10.5).pan,
    ).toBe(false);
    expect(
      computeRecaptureRequired(
        { pan: { error_pct: ulpAbove(10.5) } },
        10.5,
      ).pan,
    ).toBe(true);
  });

  it('threshold = +Infinity nunca marca (nenhum valor finito o excede)', () => {
    const r = computeRecaptureRequired(
      {
        pan: { error_pct: Number.MAX_VALUE },
        tilt: { error_pct: 999_999 },
      },
      Number.POSITIVE_INFINITY,
    );
    expect(r).toEqual({ pan: false, tilt: false, zoom: false });
  });

  it('threshold = NaN faz toda comparação retornar false', () => {
    const r = computeRecaptureRequired(
      { pan: { error_pct: 1e6 } },
      Number.NaN,
    );
    expect(r.pan).toBe(false);
  });
});

describe('validateObservedRange — fronteiras físicas e arredondamento', () => {
  const pan: [number, number] = [-180, 180];
  const zoom: [number, number] = [0, 1];

  it('aceita min exatamente em lo (inclusivo)', () => {
    expect(validateObservedRange(-180, 0, pan).ok).toBe(true);
  });

  it('aceita max exatamente em hi (inclusivo)', () => {
    expect(validateObservedRange(0, 180, pan).ok).toBe(true);
  });

  it('rejeita min um ULP abaixo de lo', () => {
    expect(
      validateObservedRange(ulpBelow(-180), 0, pan).error,
    ).toBe('out_of_bounds');
  });

  it('rejeita max um ULP acima de hi', () => {
    expect(
      validateObservedRange(0, ulpAbove(180), pan).error,
    ).toBe('out_of_bounds');
  });

  it('aceita min = lo + 1 ULP (ainda dentro)', () => {
    expect(validateObservedRange(ulpAbove(-180), 0, pan).ok).toBe(true);
  });

  it('aceita max = hi − 1 ULP (ainda dentro)', () => {
    expect(validateObservedRange(0, ulpBelow(180), pan).ok).toBe(true);
  });

  it('rejeita min = max no valor exato do limite superior', () => {
    expect(validateObservedRange(180, 180, pan).error).toBe('min_ge_max');
  });

  it('aceita min e max separados por 1 ULP', () => {
    const a = 0.5;
    const b = ulpAbove(0.5);
    expect(a).toBeLessThan(b);
    expect(validateObservedRange(a, b, zoom).ok).toBe(true);
  });

  it('rejeita min e max colapsados após arredondamento (mesmo bit-pattern)', () => {
    const x = 0.5;
    expect(validateObservedRange(x, x, zoom).error).toBe('min_ge_max');
  });

  it('lida com imprecisão decimal clássica (0.1 + 0.2 ≠ 0.3)', () => {
    const min = 0.1 + 0.2; // 0.30000000000000004
    const max = 0.3;
    expect(min).toBeGreaterThan(max);
    // 0.30000...4 é maior que 0.3, portanto min > max → min_ge_max.
    expect(validateObservedRange(min, max, zoom).error).toBe('min_ge_max');
  });

  it('aceita 0.3 seguido de (0.1 + 0.2) porque min < max por 1 unit de ε', () => {
    expect(validateObservedRange(0.3, 0.1 + 0.2, zoom).ok).toBe(true);
  });

  it('rejeita −0 vs +0 como min_ge_max (−0 >= +0 em >=)', () => {
    // Em JS, -0 >= 0 é true, portanto a guarda `min >= max` deve pegar.
    expect(validateObservedRange(-0, 0, zoom).error).toBe('min_ge_max');
  });

  it('aceita bounds degenerados [x, x] apenas se rejeitar qualquer par (não há min<max possível)', () => {
    // Se lo === hi, o único par válido possível seria min<max com ambos == x,
    // que é impossível — a função deve rejeitar tudo por min_ge_max.
    expect(validateObservedRange(5, 5, [5, 5]).error).toBe('min_ge_max');
    expect(validateObservedRange(4.999, 5, [5, 5]).error).toBe(
      'out_of_bounds',
    );
  });

  it('lida com bounds negativos invertidos semanticamente (lo > hi) rejeitando tudo por out_of_bounds', () => {
    // Contrato: `bounds` deve vir ordenado; se o chamador inverter, qualquer
    // valor cairá fora de pelo menos um lado.
    const inverted: [number, number] = [10, -10];
    expect(validateObservedRange(0, 5, inverted).error).toBe('out_of_bounds');
  });

  it('rejeita Number.EPSILON acima de hi', () => {
    expect(
      validateObservedRange(0, 1 + Number.EPSILON, zoom).error,
    ).toBe('out_of_bounds');
  });

  it('aceita Number.EPSILON acima de lo em zoom', () => {
    expect(validateObservedRange(Number.EPSILON, 1, zoom).ok).toBe(true);
  });

  it('rejeita ±Infinity como not_finite antes de checar bounds', () => {
    expect(
      validateObservedRange(Number.NEGATIVE_INFINITY, 0, pan).error,
    ).toBe('not_finite');
    expect(
      validateObservedRange(0, Number.POSITIVE_INFINITY, pan).error,
    ).toBe('not_finite');
  });

  it('rejeita NaN antes de min_ge_max mesmo com bounds válidos', () => {
    expect(validateObservedRange(Number.NaN, 10, pan).error).toBe('not_finite');
    expect(validateObservedRange(10, Number.NaN, pan).error).toBe('not_finite');
  });
});
