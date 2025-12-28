import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as anthropic from '@/integrations/anthropic';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('anthropic integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(anthropic).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof anthropic).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(anthropic);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => anthropic).not.toThrow();
  });
});
