import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces value', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), { initialProps: { value: 'initial' } });
    rerender({ value: 'changed' });
    expect(result.current).toBe('initial');
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe('changed');
  });

  it('cancels previous timeout', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), { initialProps: { value: 'a' } });
    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(250); });
    rerender({ value: 'c' });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe('c');
  });
});
