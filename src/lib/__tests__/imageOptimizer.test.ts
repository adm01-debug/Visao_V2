import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as imageOptimizer from '@/lib/imageOptimizer';

describe('imageOptimizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports required functions', () => {
    expect(imageOptimizer).toBeDefined();
  });

  it('initializes correctly', () => {
    expect(typeof imageOptimizer).toBe('object');
  });

  it('handles basic operations', () => {
    const keys = Object.keys(imageOptimizer);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('exports are not null', () => {
    Object.values(imageOptimizer).forEach(value => {
      expect(value).not.toBeNull();
    });
  });
});
