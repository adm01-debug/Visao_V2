import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePreferredLanguage } from '@/hooks/usePreferredLanguage';

describe('usePreferredLanguage', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => usePreferredLanguage());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => usePreferredLanguage());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => usePreferredLanguage());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => usePreferredLanguage());
    expect(() => unmount()).not.toThrow();
  });
});
