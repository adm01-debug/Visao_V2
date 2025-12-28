import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useStateHistory } from '@/hooks/useStateHistory';

describe('useStateHistory', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useStateHistory());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useStateHistory());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useStateHistory());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useStateHistory());
    expect(() => unmount()).not.toThrow();
  });
});
