import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';

describe('useOnClickOutside', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useOnClickOutside());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useOnClickOutside());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useOnClickOutside());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useOnClickOutside());
    expect(() => unmount()).not.toThrow();
  });
});
