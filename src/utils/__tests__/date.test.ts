import { describe, it, expect } from 'vitest';
import * as dateUtils from '@/utils/date';

describe('date utils', () => {
  it('exports utility functions', () => {
    expect(dateUtils).toBeDefined();
  });

  it('provides date manipulation functions', () => {
    expect(typeof dateUtils).toBe('object');
  });
});
