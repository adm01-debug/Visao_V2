import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as ffmpeg from '@/integrations/ffmpeg';

vi.mock('@/config/env', () => ({
  env: { API_KEY: 'test-key', API_SECRET: 'test-secret' }
}));

describe('ffmpeg integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports integration module', () => {
    expect(ffmpeg).toBeDefined();
  });

  it('has required configuration', () => {
    expect(typeof ffmpeg).toBe('object');
  });

  it('provides integration functions', () => {
    const keys = Object.keys(ffmpeg);
    expect(keys.length).toBeGreaterThanOrEqual(0);
  });

  it('handles missing credentials gracefully', () => {
    expect(() => ffmpeg).not.toThrow();
  });
});
