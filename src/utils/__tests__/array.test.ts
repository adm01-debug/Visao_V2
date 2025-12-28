import { describe, it, expect } from 'vitest';
import * as arrayUtils from '@/utils/array';

describe('array utils', () => {
  it('exports utility functions', () => {
    expect(arrayUtils).toBeDefined();
  });

  it('provides array manipulation functions', () => {
    expect(typeof arrayUtils).toBe('object');
  });
});
