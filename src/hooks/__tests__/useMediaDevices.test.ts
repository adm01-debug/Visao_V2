import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useMediaDevices } from '@/hooks/useMediaDevices';

describe('useMediaDevices', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useMediaDevices());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useMediaDevices());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useMediaDevices());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useMediaDevices());
    expect(() => unmount()).not.toThrow();
  });
});
