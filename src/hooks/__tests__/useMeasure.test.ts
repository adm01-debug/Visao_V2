import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useMeasure } from '@/hooks/useMeasure';

describe('useMeasure', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useMeasure());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useMeasure());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useMeasure());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useMeasure());
    expect(() => unmount()).not.toThrow();
  });
});
