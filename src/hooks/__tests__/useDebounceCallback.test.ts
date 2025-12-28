import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDebounceCallback } from '@/hooks/useDebounceCallback';

describe('useDebounceCallback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces callback', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounceCallback(callback, 500));
    act(() => { result.current(); });
    expect(callback).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(500); });
    expect(callback).toHaveBeenCalled();
  });

  it('passes arguments', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounceCallback(callback, 500));
    act(() => { result.current('arg1', 'arg2'); });
    act(() => { vi.advanceTimersByTime(500); });
    expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
  });
});
