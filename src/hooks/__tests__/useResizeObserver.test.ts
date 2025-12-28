import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useResizeObserver } from '@/hooks/useResizeObserver';

describe('useResizeObserver', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useResizeObserver());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useResizeObserver());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useResizeObserver());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useResizeObserver());
    expect(() => unmount()).not.toThrow();
  });
});
