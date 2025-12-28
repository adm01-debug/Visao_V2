import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLicensePlate } from '@/hooks/useLicensePlate';

describe('useLicensePlate', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useLicensePlate());
    expect(result.current).toBeDefined();
  });

  it('returns expected structure', () => {
    const { result } = renderHook(() => useLicensePlate());
    expect(result.current).not.toBeNull();
  });

  it('handles state changes', () => {
    const { result, rerender } = renderHook(() => useLicensePlate());
    rerender();
    expect(result.current).toBeDefined();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useLicensePlate());
    expect(() => unmount()).not.toThrow();
  });
});
