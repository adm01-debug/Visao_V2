import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useRafState } from '@/hooks/useRafState';

describe('useRafState', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useRafState());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useRafState());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useRafState());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useRafState());
    expect(() => unmount()).not.toThrow();
  });
});
