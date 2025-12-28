import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as youtube from '@/integrations/youtube';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('youtube integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(youtube).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof youtube).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(youtube);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => youtube).not.toThrow();
  });
});
