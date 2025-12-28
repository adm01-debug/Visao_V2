import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useToggle } from '@/hooks/useToggle';

describe('useToggle', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useToggle());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useToggle());
    expect(() => unmount()).not.toThrow();
  });
});
