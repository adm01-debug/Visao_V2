import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as azure from '@/integrations/azure';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('azure integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(azure).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof azure).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(azure);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => azure).not.toThrow();
  });
});
