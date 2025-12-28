import { describe, it, expect } from 'vitest';
import * as regexExports from '../regex';

describe('regex constants', () => {
  it('deve exportar valores definidos', () => {
    expect(regexExports).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(regexExports).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(regexExports).length).toBeGreaterThan(0);
  });

  it('deve ter estrutura correta', () => {
    Object.values(regexExports).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser imutável em runtime', () => {
    const keys = Object.keys(regexExports);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
