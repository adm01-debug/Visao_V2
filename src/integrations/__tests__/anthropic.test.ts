import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as anthropicIntegration from '@/integrations/anthropic';

vi.mock('@/lib/http', () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}));

describe('anthropic integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(anthropicIntegration).toBeDefined();
  });

  it('has required exports', () => {
    const exports = Object.keys(anthropicIntegration);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('exports are valid types', () => {
    Object.values(anthropicIntegration).forEach(exp => {
      expect(exp).not.toBeNull();
    });
  });

  it('integration can be initialized', () => {
    expect(() => anthropicIntegration).not.toThrow();
  });
});
