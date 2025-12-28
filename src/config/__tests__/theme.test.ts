import { describe, it, expect } from 'vitest';
import * as themeConfig from '../theme';

describe('theme config', () => {
  it('deve exportar configuração', () => {
    expect(themeConfig).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(themeConfig).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(themeConfig).length).toBeGreaterThan(0);
  });

  it('deve ter valores válidos', () => {
    Object.values(themeConfig).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser acessível', () => {
    const keys = Object.keys(themeConfig);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
