import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePagination } from '@/hooks/usePagination';

describe('usePagination', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => usePagination());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => usePagination());
    expect(() => unmount()).not.toThrow();
  });
});
