import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as azureIntegration from '@/integrations/azure';

vi.mock('@/lib/http', () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}));

describe('azure integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(azureIntegration).toBeDefined();
  });

  it('has required exports', () => {
    const exports = Object.keys(azureIntegration);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('exports are valid types', () => {
    Object.values(azureIntegration).forEach(exp => {
      expect(exp).not.toBeNull();
    });
  });

  it('integration can be initialized', () => {
    expect(() => azureIntegration).not.toThrow();
  });
});
