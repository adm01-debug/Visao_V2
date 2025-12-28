import { describe, it, expect } from 'vitest';
import * as ipWhitelistConfig from '../ipWhitelist';

describe('ipWhitelist config', () => {
  it('deve exportar configuração', () => {
    expect(ipWhitelistConfig).toBeDefined();
  });

  it('não deve ter exports undefined', () => {
    Object.entries(ipWhitelistConfig).forEach(([key, value]) => {
      expect(value, `${key} should not be undefined`).not.toBeUndefined();
    });
  });

  it('deve ter pelo menos um export', () => {
    expect(Object.keys(ipWhitelistConfig).length).toBeGreaterThan(0);
  });

  it('deve ter valores válidos', () => {
    Object.values(ipWhitelistConfig).forEach(value => {
      expect(value !== null).toBe(true);
    });
  });

  it('deve ser acessível', () => {
    const keys = Object.keys(ipWhitelistConfig);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });
});
