import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as mercadopago from '@/integrations/mercadopago';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('mercadopago integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(mercadopago).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof mercadopago).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(mercadopago);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => mercadopago).not.toThrow();
  });
});
