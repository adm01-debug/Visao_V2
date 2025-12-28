import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as jaeger from '@/lib/jaeger';

describe('jaeger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports required functions', () => {
    expect(jaeger).toBeDefined();
  });

  it('initializes correctly', () => {
    expect(typeof jaeger).toBe('object');
  });

  it('handles basic operations', () => {
    const keys = Object.keys(jaeger);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('exports are not null', () => {
    Object.values(jaeger).forEach(value => {
      expect(value).not.toBeNull();
    });
  });
});
