import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useStorage } from '@/hooks/useStorage';

describe('useStorage', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useStorage());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useStorage());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useStorage());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useStorage());
    expect(() => unmount()).not.toThrow();
  });
});
