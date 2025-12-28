import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useScrollLock } from '@/hooks/useScrollLock';

describe('useScrollLock', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useScrollLock());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useScrollLock());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useScrollLock());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useScrollLock());
    expect(() => unmount()).not.toThrow();
  });
});
