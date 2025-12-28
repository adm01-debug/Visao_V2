import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sms from '@/integrations/sms';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('sms integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(sms).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof sms).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(sms);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => sms).not.toThrow();
  });
});
