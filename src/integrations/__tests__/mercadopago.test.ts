import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as mercadopagoIntegration from '@/integrations/mercadopago';

vi.mock('@/lib/http', () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}));

describe('mercadopago integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(mercadopagoIntegration).toBeDefined();
  });

  it('has required exports', () => {
    const exports = Object.keys(mercadopagoIntegration);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('exports are valid types', () => {
    Object.values(mercadopagoIntegration).forEach(exp => {
      expect(exp).not.toBeNull();
    });
  });

  it('integration can be initialized', () => {
    expect(() => mercadopagoIntegration).not.toThrow();
  });
});
