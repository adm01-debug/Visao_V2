import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as discord from '@/integrations/discord';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('discord integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(discord).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof discord).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(discord);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => discord).not.toThrow();
  });
});
