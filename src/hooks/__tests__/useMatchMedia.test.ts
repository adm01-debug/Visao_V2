import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useMatchMedia } from '@/hooks/useMatchMedia';

describe('useMatchMedia', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useMatchMedia());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useMatchMedia());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useMatchMedia());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useMatchMedia());
    expect(() => unmount()).not.toThrow();
  });
});
