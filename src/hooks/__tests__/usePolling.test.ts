import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePolling } from '@/hooks/usePolling';

describe('usePolling', () => {
  it('deve executar callback periodicamente', () => {
    vi.useFakeTimers();
    const callback = vi.fn().mockResolvedValue('data');
    renderHook(() => usePolling(callback, 1000));
    act(() => { vi.advanceTimersByTime(3000); });
    expect(callback).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('deve parar polling', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const { result } = renderHook(() => usePolling(callback, 1000));
    act(() => { result.current.stop(); });
    act(() => { vi.advanceTimersByTime(3000); });
    vi.useRealTimers();
  });
});
