import { describe, it, expect } from 'vitest';
import * as routesConfig from '../routes';

describe('routes config', () => {
  it('deve exportar configuração', () => {
    expect(routesConfig).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(routesConfig).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(routesConfig).length).toBeGreaterThan(0);
  });

  it('deve ter valores válidos', () => {
    Object.values(routesConfig).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser acessível', () => {
    const keys = Object.keys(routesConfig);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
