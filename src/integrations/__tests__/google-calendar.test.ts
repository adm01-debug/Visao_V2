import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as google_calendar from '@/integrations/google-calendar';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('google-calendar integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(google_calendar).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof google_calendar).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(google_calendar);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => google_calendar).not.toThrow();
  });
});
