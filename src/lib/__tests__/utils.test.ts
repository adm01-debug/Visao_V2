import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges class names', () => {
      expect(cn('a', 'b')).toContain('a');
      expect(cn('a', 'b')).toContain('b');
    });

    it('handles empty input', () => {
      expect(cn()).toBe('');
    });

    it('handles undefined values', () => {
      expect(cn('a', undefined, 'b')).toBe('a b');
    });

    it('handles conditional classes', () => {
      const isActive = true;
      expect(cn('base', isActive && 'active')).toContain('active');
    });

    it('merges tailwind classes correctly', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('handles array input', () => {
      expect(cn(['a', 'b'])).toContain('a');
    });
  });
});
