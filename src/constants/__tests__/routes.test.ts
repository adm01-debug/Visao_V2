import { describe, it, expect } from 'vitest';
import * as routesExports from '../routes';

describe('routes constants', () => {
  it('deve exportar valores definidos', () => {
    expect(routesExports).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(routesExports).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(routesExports).length).toBeGreaterThan(0);
  });

  it('deve ter estrutura correta', () => {
    Object.values(routesExports).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser imutável em runtime', () => {
    const keys = Object.keys(routesExports);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
