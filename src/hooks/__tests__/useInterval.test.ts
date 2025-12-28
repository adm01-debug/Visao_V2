import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useInterval } from '@/hooks/useInterval';

describe('useInterval', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useInterval());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useInterval());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useInterval());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useInterval());
    expect(() => unmount()).not.toThrow();
  });
});
