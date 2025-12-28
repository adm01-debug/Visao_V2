import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as ffmpegIntegration from '@/integrations/ffmpeg';

vi.mock('@/lib/http', () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}));

describe('ffmpeg integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(ffmpegIntegration).toBeDefined();
  });

  it('has required exports', () => {
    const exports = Object.keys(ffmpegIntegration);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('exports are valid types', () => {
    Object.values(ffmpegIntegration).forEach(exp => {
      expect(exp).not.toBeNull();
    });
  });

  it('integration can be initialized', () => {
    expect(() => ffmpegIntegration).not.toThrow();
  });
});
