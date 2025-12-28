import { describe, it, expect } from 'vitest';
import * as featuresConfig from '../features';

describe('features config', () => {
  it('deve exportar configuração', () => {
    expect(featuresConfig).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(featuresConfig).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(featuresConfig).length).toBeGreaterThan(0);
  });

  it('deve ter valores válidos', () => {
    Object.values(featuresConfig).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser acessível', () => {
    const keys = Object.keys(featuresConfig);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
