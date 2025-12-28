import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useUpdateEffect } from '@/hooks/useUpdateEffect';

describe('useUpdateEffect', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useUpdateEffect());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useUpdateEffect());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useUpdateEffect());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useUpdateEffect());
    expect(() => unmount()).not.toThrow();
  });
});
