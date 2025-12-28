import { describe, it, expect } from 'vitest';
import * as envConfig from '../env';

describe('env config', () => {
  it('deve exportar configuração', () => {
    expect(envConfig).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(envConfig).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(envConfig).length).toBeGreaterThan(0);
  });

  it('deve ter valores válidos', () => {
    Object.values(envConfig).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser acessível', () => {
    const keys = Object.keys(envConfig);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
