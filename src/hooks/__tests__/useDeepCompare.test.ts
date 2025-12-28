import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDeepCompare } from '@/hooks/useDeepCompare';

describe('useDeepCompare', () => {
  it('returns true for equal objects', () => {
    const { result } = renderHook(() => useDeepCompare({ a: 1, b: 2 }, { a: 1, b: 2 }));
    expect(result.current).toBe(true);
  });

  it('returns false for different objects', () => {
    const { result } = renderHook(() => useDeepCompare({ a: 1 }, { a: 2 }));
    expect(result.current).toBe(false);
  });

  it('handles nested objects', () => {
    const { result } = renderHook(() => useDeepCompare({ a: { b: 1 } }, { a: { b: 1 } }));
    expect(result.current).toBe(true);
  });

  it('handles arrays', () => {
    const { result } = renderHook(() => useDeepCompare([1, 2, 3], [1, 2, 3]));
    expect(result.current).toBe(true);
  });
});
