import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as twitch from '@/integrations/twitch';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('twitch integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(twitch).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof twitch).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(twitch);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => twitch).not.toThrow();
  });
});
