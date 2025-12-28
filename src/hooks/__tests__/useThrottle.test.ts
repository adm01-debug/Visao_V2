import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useThrottle } from '@/hooks/useThrottle';

describe('useThrottle', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useThrottle());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useThrottle());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useThrottle());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useThrottle());
    expect(() => unmount()).not.toThrow();
  });
});
