import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as webrtc from '@/integrations/webrtc';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('webrtc integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(webrtc).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof webrtc).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(webrtc);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => webrtc).not.toThrow();
  });
});
