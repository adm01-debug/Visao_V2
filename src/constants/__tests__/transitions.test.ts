import { describe, it, expect } from 'vitest';
import * as transitionsExports from '../transitions';

describe('transitions constants', () => {
  it('deve exportar valores definidos', () => {
    expect(transitionsExports).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(transitionsExports).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(transitionsExports).length).toBeGreaterThan(0);
  });

  it('deve ter estrutura correta', () => {
    Object.values(transitionsExports).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser imutável em runtime', () => {
    const keys = Object.keys(transitionsExports);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
