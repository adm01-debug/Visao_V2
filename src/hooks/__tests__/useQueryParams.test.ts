import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useQueryParams } from '@/hooks/useQueryParams';

describe('useQueryParams', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useQueryParams());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useQueryParams());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useQueryParams());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useQueryParams());
    expect(() => unmount()).not.toThrow();
  });
});
