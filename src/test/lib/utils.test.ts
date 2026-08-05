import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn (class names utility)', () => {
  it('merges classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
  it('handles conditional', () => {
    // eslint-disable-next-line no-constant-binary-expression -- intentional falsy input under test
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });
  it('handles undefined', () => {
    expect(cn('a', undefined, 'b')).toBe('a b');
  });
  it('handles empty', () => {
    expect(cn()).toBe('');
  });
  it('merges tailwind conflicts', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
  it('handles arrays', () => {
    expect(cn(['a', 'b'])).toBe('a b');
  });
  it('handles objects', () => {
    expect(cn({ 'font-bold': true, italic: false })).toBe('font-bold');
  });
  it('complex merge', () => {
    const result = cn('px-2 py-1', 'px-4', { 'font-bold': true });
    expect(result).toContain('px-4');
    expect(result).toContain('py-1');
    expect(result).toContain('font-bold');
    expect(result).not.toContain('px-2');
  });
});
