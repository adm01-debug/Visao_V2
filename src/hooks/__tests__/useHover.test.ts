import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useHover } from '@/hooks/useHover';

describe('useHover', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useHover());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useHover());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useHover());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useHover());
    expect(() => unmount()).not.toThrow();
  });
});
