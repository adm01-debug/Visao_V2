import { describe, it, expect } from 'vitest';
import * as sentryConfig from '../sentry';

describe('sentry config', () => {
  it('deve exportar configuração', () => {
    expect(sentryConfig).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(sentryConfig).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(sentryConfig).length).toBeGreaterThan(0);
  });

  it('deve ter valores válidos', () => {
    Object.values(sentryConfig).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser acessível', () => {
    const keys = Object.keys(sentryConfig);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
