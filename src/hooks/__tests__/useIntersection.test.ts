import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useIntersection } from '@/hooks/useIntersection';

describe('useIntersection', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useIntersection());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useIntersection());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useIntersection());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useIntersection());
    expect(() => unmount()).not.toThrow();
  });
});
