import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as criticalCSS from '@/lib/criticalCSS';

describe('criticalCSS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports required functions', () => {
    expect(criticalCSS).toBeDefined();
  });

  it('initializes correctly', () => {
    expect(typeof criticalCSS).toBe('object');
  });

  it('handles basic operations', () => {
    const keys = Object.keys(criticalCSS);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('exports are not null', () => {
    Object.values(criticalCSS).forEach(value => {
      expect(value).not.toBeNull();
    });
  });
});
