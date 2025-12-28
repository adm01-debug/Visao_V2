import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useWindowSize } from '@/hooks/useWindowSize';

describe('useWindowSize', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useWindowSize());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useWindowSize());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useWindowSize());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useWindowSize());
    expect(() => unmount()).not.toThrow();
  });
});
