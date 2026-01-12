import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '../useCountdown';

describe('useCountdown', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('should initialize with given seconds', () => {
    const { result } = renderHook(() => useCountdown(60));
    expect(result.current.seconds).toBe(60);
    expect(result.current.isRunning).toBe(false);
  });

  it('should countdown when started', () => {
    const { result } = renderHook(() => useCountdown(5));
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.seconds).toBe(3);
  });

  it('should pause countdown', () => {
    const { result } = renderHook(() => useCountdown(10));
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(3000); });
    act(() => { result.current.pause(); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.seconds).toBe(7);
  });

  it('should reset countdown', () => {
    const { result } = renderHook(() => useCountdown(10));
    act(() => { result.current.start(); });
    act(() => { vi.advanceTimersByTime(5000); });
    act(() => { result.current.reset(); });
    expect(result.current.seconds).toBe(10);
  });
});
