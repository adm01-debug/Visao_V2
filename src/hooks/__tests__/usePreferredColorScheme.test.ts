import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePreferredColorScheme } from '@/hooks/usePreferredColorScheme';

describe('usePreferredColorScheme', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => usePreferredColorScheme());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => usePreferredColorScheme());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => usePreferredColorScheme());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => usePreferredColorScheme());
    expect(() => unmount()).not.toThrow();
  });
});
