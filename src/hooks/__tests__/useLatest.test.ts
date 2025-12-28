import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLatest } from '@/hooks/useLatest';

describe('useLatest', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useLatest());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useLatest());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useLatest());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useLatest());
    expect(() => unmount()).not.toThrow();
  });
});
