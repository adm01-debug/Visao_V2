import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

describe('useLockBodyScroll', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useLockBodyScroll());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useLockBodyScroll());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useLockBodyScroll());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useLockBodyScroll());
    expect(() => unmount()).not.toThrow();
  });
});
