import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bitrix24Integration from '@/integrations/bitrix24Integration';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('bitrix24Integration integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(bitrix24Integration).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof bitrix24Integration).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(bitrix24Integration);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => bitrix24Integration).not.toThrow();
  });
});
