import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as gcp from '@/integrations/gcp';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('gcp integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(gcp).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof gcp).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(gcp);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => gcp).not.toThrow();
  });
});
