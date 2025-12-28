import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useAbortController } from '@/hooks/useAbortController';

describe('useAbortController', () => {
  it('creates AbortController', () => {
    const { result } = renderHook(() => useAbortController());
    expect(result.current.signal).toBeInstanceOf(AbortSignal);
  });

  it('aborts on unmount', () => {
    const { result, unmount } = renderHook(() => useAbortController());
    const signal = result.current.signal;
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('creates new controller on reset', () => {
    const { result } = renderHook(() => useAbortController());
    const firstSignal = result.current.signal;
    act(() => result.current.reset());
    expect(result.current.signal).not.toBe(firstSignal);
  });

  it('aborts manually', () => {
    const { result } = renderHook(() => useAbortController());
    act(() => result.current.abort());
    expect(result.current.signal.aborted).toBe(true);
  });
});
