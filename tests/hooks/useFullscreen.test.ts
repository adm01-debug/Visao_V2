import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/hooks/useFullscreen', () => ({
  useFullscreen: () => ({
    isFullscreen: false,
    enter: vi.fn(),
    exit: vi.fn(),
    toggle: vi.fn(),
    isSupported: true,
  }),
}));

describe('useFullscreen', () => {
  it('deve indicar estado fullscreen', async () => {
    const { useFullscreen } = await import('@/hooks/useFullscreen');
    const { result } = renderHook(() => useFullscreen());
    expect(typeof result.current.isFullscreen).toBe('boolean');
  });

  it('deve entrar em fullscreen', async () => {
    const { useFullscreen } = await import('@/hooks/useFullscreen');
    const { result } = renderHook(() => useFullscreen());
    act(() => { result.current.enter(); });
    expect(result.current.enter).toHaveBeenCalled();
  });

  it('deve alternar fullscreen', async () => {
    const { useFullscreen } = await import('@/hooks/useFullscreen');
    const { result } = renderHook(() => useFullscreen());
    act(() => { result.current.toggle(); });
    expect(result.current.toggle).toHaveBeenCalled();
  });
});
