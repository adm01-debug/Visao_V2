import { describe, it, expect } from 'vitest';
import isEqual from '../isEqual';

describe('isEqual', () => {
  it('should compare primitives', () => {
    expect(isEqual(1, 1)).toBe(true);
    expect(isEqual(1, 2)).toBe(false);
    expect(isEqual('a', 'a')).toBe(true);
  });
  it('should compare objects', () => {
    expect(isEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
  it('should compare arrays', () => {
    expect(isEqual([1, 2], [1, 2])).toBe(true);
    expect(isEqual([1, 2], [1, 3])).toBe(false);
  });
});
