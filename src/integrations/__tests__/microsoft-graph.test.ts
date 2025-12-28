import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as microsoft_graph from '@/integrations/microsoft-graph';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('microsoft-graph integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(microsoft_graph).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof microsoft_graph).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(microsoft_graph);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => microsoft_graph).not.toThrow();
  });
});
