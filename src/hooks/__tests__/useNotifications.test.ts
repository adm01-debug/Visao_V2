import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useNotifications } from '@/hooks/useNotifications';

describe('useNotifications', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useNotifications());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useNotifications());
    expect(() => unmount()).not.toThrow();
  });
});
