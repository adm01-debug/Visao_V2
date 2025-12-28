import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useEventCallback } from '@/hooks/useEventCallback';

describe('useEventCallback', () => {
  it('returns stable callback', () => {
    const fn = vi.fn();
    const { result, rerender } = renderHook(() => useEventCallback(fn));
    const firstCallback = result.current;
    rerender();
    expect(result.current).toBe(firstCallback);
  });

  it('calls latest function', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const { result, rerender } = renderHook(({ fn }) => useEventCallback(fn), { initialProps: { fn: fn1 } });
    rerender({ fn: fn2 });
    result.current();
    expect(fn2).toHaveBeenCalled();
    expect(fn1).not.toHaveBeenCalled();
  });
});
