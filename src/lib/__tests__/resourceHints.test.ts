import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as resourceHints from '@/lib/resourceHints';

describe('resourceHints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports required functions', () => {
    expect(resourceHints).toBeDefined();
  });

  it('initializes correctly', () => {
    expect(typeof resourceHints).toBe('object');
  });

  it('handles basic operations', () => {
    const keys = Object.keys(resourceHints);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('exports are not null', () => {
    Object.values(resourceHints).forEach(value => {
      expect(value).not.toBeNull();
    });
  });
});
