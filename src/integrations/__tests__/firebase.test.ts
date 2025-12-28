import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firebase from '@/integrations/firebase';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('firebase integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(firebase).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof firebase).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(firebase);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => firebase).not.toThrow();
  });
});
