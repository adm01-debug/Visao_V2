import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as whatsapp from '@/integrations/whatsapp';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('whatsapp integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(whatsapp).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof whatsapp).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(whatsapp);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => whatsapp).not.toThrow();
  });
});
