import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDeviceMotion } from '@/hooks/useDeviceMotion';

describe('useDeviceMotion', () => {
  it('deve retornar valores iniciais', () => {
    const { result } = renderHook(() => useDeviceMotion());
    expect(result.current.acceleration).toBeDefined();
    expect(result.current.rotationRate).toBeDefined();
  });

  it('deve atualizar ao receber evento', () => {
    const { result } = renderHook(() => useDeviceMotion());
    const event = new Event('devicemotion');
    Object.assign(event, { acceleration: { x: 1, y: 2, z: 3 } });
    act(() => { window.dispatchEvent(event); });
  });

  it('deve limpar listener ao desmontar', () => {
    const spy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useDeviceMotion());
    unmount();
    expect(spy).toHaveBeenCalledWith('devicemotion', expect.any(Function));
  });
});
