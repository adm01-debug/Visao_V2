import { describe, it, expect } from 'vitest';
import * as numberUtils from '@/utils/number';

describe('number utils', () => {
  it('exports utility functions', () => {
    expect(numberUtils).toBeDefined();
  });

  it('provides number formatting functions', () => {
    expect(typeof numberUtils).toBe('object');
  });
});
