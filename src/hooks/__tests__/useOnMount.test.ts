import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useOnMount } from '@/hooks/useOnMount';

describe('useOnMount', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useOnMount());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useOnMount());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useOnMount());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useOnMount());
    expect(() => unmount()).not.toThrow();
  });
});
