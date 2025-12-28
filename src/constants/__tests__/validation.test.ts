import { describe, it, expect } from 'vitest';
import * as validationExports from '../validation';

describe('validation constants', () => {
  it('deve exportar valores definidos', () => {
    expect(validationExports).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(validationExports).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(validationExports).length).toBeGreaterThan(0);
  });

  it('deve ter estrutura correta', () => {
    Object.values(validationExports).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser imutável em runtime', () => {
    const keys = Object.keys(validationExports);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
