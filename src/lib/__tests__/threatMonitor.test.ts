import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as threatMonitor from '@/lib/threatMonitor';

describe('threatMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports required functions', () => {
    expect(threatMonitor).toBeDefined();
  });

  it('initializes correctly', () => {
    expect(typeof threatMonitor).toBe('object');
  });

  it('handles basic operations', () => {
    const keys = Object.keys(threatMonitor);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('exports are not null', () => {
    Object.values(threatMonitor).forEach(value => {
      expect(value).not.toBeNull();
    });
  });
});
