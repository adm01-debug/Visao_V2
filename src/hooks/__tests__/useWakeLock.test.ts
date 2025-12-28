import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useWakeLock } from '@/hooks/useWakeLock';

describe('useWakeLock', () => {
  it('deve verificar suporte', () => {
    const { result } = renderHook(() => useWakeLock());
    expect(result.current.isSupported).toBeDefined();
  });

  it('deve solicitar wake lock', async () => {
    navigator.wakeLock = { request: vi.fn().mockResolvedValue({ release: vi.fn() }) } as any;
    const { result } = renderHook(() => useWakeLock());
    await act(async () => { await result.current.request(); });
  });
});
