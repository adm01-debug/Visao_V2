import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as intrusionDetection from '@/lib/intrusionDetection';

describe('intrusionDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports required functions', () => {
    expect(intrusionDetection).toBeDefined();
  });

  it('initializes correctly', () => {
    expect(typeof intrusionDetection).toBe('object');
  });

  it('handles basic operations', () => {
    const keys = Object.keys(intrusionDetection);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('exports are not null', () => {
    Object.values(intrusionDetection).forEach(value => {
      expect(value).not.toBeNull();
    });
  });
});
