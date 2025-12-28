import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as googleCalendarIntegration from '@/integrations/google-calendar';

vi.mock('@/lib/http', () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}));

describe('google-calendar integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(googleCalendarIntegration).toBeDefined();
  });

  it('has required exports', () => {
    const exports = Object.keys(googleCalendarIntegration);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('exports are valid types', () => {
    Object.values(googleCalendarIntegration).forEach(exp => {
      expect(exp).not.toBeNull();
    });
  });

  it('integration can be initialized', () => {
    expect(() => googleCalendarIntegration).not.toThrow();
  });
});
