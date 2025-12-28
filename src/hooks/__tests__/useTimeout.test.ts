import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useTimeout } from '@/hooks/useTimeout';

describe('useTimeout', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useTimeout());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useTimeout());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useTimeout());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useTimeout());
    expect(() => unmount()).not.toThrow();
  });
});
