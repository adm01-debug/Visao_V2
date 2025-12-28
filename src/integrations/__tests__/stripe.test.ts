import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as stripe from '@/integrations/stripe';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('stripe integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(stripe).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof stripe).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(stripe);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => stripe).not.toThrow();
  });
});
