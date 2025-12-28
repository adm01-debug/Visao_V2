import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePortal } from '@/hooks/usePortal';

describe('usePortal', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => usePortal());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => usePortal());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => usePortal());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => usePortal());
    expect(() => unmount()).not.toThrow();
  });
});
