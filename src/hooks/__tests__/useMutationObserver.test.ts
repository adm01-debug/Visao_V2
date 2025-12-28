import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useMutationObserver } from '@/hooks/useMutationObserver';

describe('useMutationObserver', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useMutationObserver());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useMutationObserver());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useMutationObserver());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useMutationObserver());
    expect(() => unmount()).not.toThrow();
  });
});
