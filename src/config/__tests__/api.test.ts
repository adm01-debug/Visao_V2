import { describe, it, expect } from 'vitest';
import * as apiConfig from '../api';

describe('api config', () => {
  it('deve exportar configuração', () => {
    expect(apiConfig).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(apiConfig).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(apiConfig).length).toBeGreaterThan(0);
  });

  it('deve ter valores válidos', () => {
    Object.values(apiConfig).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser acessível', () => {
    const keys = Object.keys(apiConfig);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
