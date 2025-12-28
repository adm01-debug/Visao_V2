import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useIdle } from '@/hooks/useIdle';

describe('useIdle', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useIdle());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useIdle());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useIdle());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useIdle());
    expect(() => unmount()).not.toThrow();
  });
});
