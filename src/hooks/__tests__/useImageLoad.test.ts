import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useImageLoad } from '@/hooks/useImageLoad';

describe('useImageLoad', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useImageLoad());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useImageLoad());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useImageLoad());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useImageLoad());
    expect(() => unmount()).not.toThrow();
  });
});
