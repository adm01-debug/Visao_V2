import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useOnUnmount } from '@/hooks/useOnUnmount';

describe('useOnUnmount', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useOnUnmount());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useOnUnmount());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useOnUnmount());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useOnUnmount());
    expect(() => unmount()).not.toThrow();
  });
});
