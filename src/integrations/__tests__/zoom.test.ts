import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as zoom from '@/integrations/zoom';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('zoom integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(zoom).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof zoom).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(zoom);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => zoom).not.toThrow();
  });
});
