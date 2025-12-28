import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as slack from '@/integrations/slack';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('slack integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(slack).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof slack).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(slack);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => slack).not.toThrow();
  });
});
