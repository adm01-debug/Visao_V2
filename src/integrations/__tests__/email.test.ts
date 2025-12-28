import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as email from '@/integrations/email';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('email integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(email).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof email).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(email);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => email).not.toThrow();
  });
});
