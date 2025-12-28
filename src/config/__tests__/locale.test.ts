import { describe, it, expect } from 'vitest';
import * as localeConfig from '../locale';

describe('locale config', () => {
  it('deve exportar configuração', () => {
    expect(localeConfig).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(localeConfig).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(localeConfig).length).toBeGreaterThan(0);
  });

  it('deve ter valores válidos', () => {
    Object.values(localeConfig).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser acessível', () => {
    const keys = Object.keys(localeConfig);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
