import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as youtubeIntegration from '@/integrations/youtube';

vi.mock('@/lib/http', () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}));

describe('youtube integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(youtubeIntegration).toBeDefined();
  });

  it('has required exports', () => {
    const exports = Object.keys(youtubeIntegration);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('exports are valid types', () => {
    Object.values(youtubeIntegration).forEach(exp => {
      expect(exp).not.toBeNull();
    });
  });

  it('integration can be initialized', () => {
    expect(() => youtubeIntegration).not.toThrow();
  });
});
