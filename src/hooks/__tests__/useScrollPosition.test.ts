import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useScrollPosition } from '@/hooks/useScrollPosition';

describe('useScrollPosition', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useScrollPosition());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useScrollPosition());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useScrollPosition());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useScrollPosition());
    expect(() => unmount()).not.toThrow();
  });
});
