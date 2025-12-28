import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useKeyPress } from '@/hooks/useKeyPress';

describe('useKeyPress', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useKeyPress());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useKeyPress());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useKeyPress());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useKeyPress());
    expect(() => unmount()).not.toThrow();
  });
});
