import { describe, it, expect } from 'vitest';
import { computePhaseTimeout } from '../preflightTimeout';

describe('computePhaseTimeout', () => {
  it('retorna fallback quando sweep é nulo/inválido', () => {
    expect(computePhaseTimeout(undefined)).toBe(12_000);
    expect(computePhaseTimeout(null)).toBe(12_000);
    expect(computePhaseTimeout(0)).toBe(12_000);
    expect(computePhaseTimeout(Number.NaN)).toBe(12_000);
    expect(computePhaseTimeout(-500)).toBe(12_000);
  });

  it('aplica piso de 4s quando sweep é muito curto', () => {
    expect(computePhaseTimeout(1000)).toBe(4_000); // 1500 -> clamp 4000
    expect(computePhaseTimeout(2500)).toBe(4_000); // 3750 -> clamp 4000
  });

  it('usa sweep * 1.5 dentro do intervalo', () => {
    expect(computePhaseTimeout(4_000)).toBe(6_000);
    expect(computePhaseTimeout(8_000)).toBe(12_000);
    expect(computePhaseTimeout(10_000)).toBe(15_000);
  });

  it('aplica teto de 20s para sweeps longos', () => {
    expect(computePhaseTimeout(15_000)).toBe(20_000); // 22500 -> clamp 20000
    expect(computePhaseTimeout(60_000)).toBe(20_000);
  });

  it('arredonda para inteiro', () => {
    const v = computePhaseTimeout(5_333);
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBe(Math.round(5_333 * 1.5));
  });
});
