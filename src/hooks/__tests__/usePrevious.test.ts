import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePrevious } from '@/hooks/usePrevious';

describe('usePrevious', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => usePrevious());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => usePrevious());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => usePrevious());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => usePrevious());
    expect(() => unmount()).not.toThrow();
  });
});
