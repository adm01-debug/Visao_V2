import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useIdleDetection } from '@/hooks/useIdleDetection';

describe('useIdleDetection', () => {
  it('deve detectar inatividade após timeout', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useIdleDetection({ timeout: 1000 }));
    expect(result.current.isIdle).toBe(false);
    act(() => { vi.advanceTimersByTime(1100); });
    expect(result.current.isIdle).toBe(true);
    vi.useRealTimers();
  });

  it('deve resetar ao detectar atividade', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useIdleDetection({ timeout: 1000 }));
    act(() => { vi.advanceTimersByTime(500); });
    act(() => { window.dispatchEvent(new Event('mousemove')); });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.isIdle).toBe(false);
    vi.useRealTimers();
  });

  it('deve retornar último tempo ativo', () => {
    const { result } = renderHook(() => useIdleDetection({ timeout: 1000 }));
    expect(result.current.lastActive).toBeDefined();
  });
});
