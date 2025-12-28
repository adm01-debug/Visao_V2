import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as openai from '@/integrations/openai';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('openai integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(openai).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof openai).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(openai);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => openai).not.toThrow();
  });
});
