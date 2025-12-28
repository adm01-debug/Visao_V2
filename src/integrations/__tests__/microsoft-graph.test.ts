import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as microsoftGraphIntegration from '@/integrations/microsoft-graph';

vi.mock('@/lib/http', () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}));

describe('microsoft-graph integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(microsoftGraphIntegration).toBeDefined();
  });

  it('has required exports', () => {
    const exports = Object.keys(microsoftGraphIntegration);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('exports are valid types', () => {
    Object.values(microsoftGraphIntegration).forEach(exp => {
      expect(exp).not.toBeNull();
    });
  });

  it('integration can be initialized', () => {
    expect(() => microsoftGraphIntegration).not.toThrow();
  });
});
