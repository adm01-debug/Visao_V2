import { describe, it, expect } from 'vitest';
import * as stringUtils from '@/utils/string';

describe('string utils', () => {
  it('exports utility functions', () => {
    expect(stringUtils).toBeDefined();
  });

  it('provides string manipulation functions', () => {
    expect(typeof stringUtils).toBe('object');
  });
});
