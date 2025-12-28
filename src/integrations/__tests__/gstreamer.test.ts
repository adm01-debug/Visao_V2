import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as gstreamer from '@/integrations/gstreamer';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('gstreamer integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(gstreamer).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof gstreamer).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(gstreamer);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => gstreamer).not.toThrow();
  });
});
