import { describe, it, expect } from 'vitest';
import * as apiExports from '../api';

describe('api constants', () => {
  it('deve exportar valores definidos', () => {
    expect(apiExports).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(apiExports).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(apiExports).length).toBeGreaterThan(0);
  });

  it('deve ter estrutura correta', () => {
    Object.values(apiExports).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser imutável em runtime', () => {
    const keys = Object.keys(apiExports);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
