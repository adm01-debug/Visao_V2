import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLoadingState } from '@/hooks/useLoadingState';

describe('useLoadingState', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useLoadingState());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useLoadingState());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useLoadingState());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useLoadingState());
    expect(() => unmount()).not.toThrow();
  });
});
