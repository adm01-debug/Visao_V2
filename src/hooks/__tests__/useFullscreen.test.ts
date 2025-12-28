import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useFullscreen } from '@/hooks/useFullscreen';

describe('useFullscreen', () => {
  it('deve verificar estado fullscreen', () => {
    const { result } = renderHook(() => useFullscreen());
    expect(result.current.isFullscreen).toBe(false);
  });

  it('deve entrar em fullscreen', async () => {
    document.documentElement.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFullscreen());
    await act(async () => { await result.current.enter(); });
  });

  it('deve sair de fullscreen', async () => {
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFullscreen());
    await act(async () => { await result.current.exit(); });
  });

  it('deve alternar fullscreen', async () => {
    document.documentElement.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFullscreen());
    await act(async () => { await result.current.toggle(); });
  });
});
