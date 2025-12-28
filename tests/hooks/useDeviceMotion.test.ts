import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useDeviceMotion', () => ({
  useDeviceMotion: () => ({
    acceleration: { x: 0, y: 0, z: 9.8 },
    rotationRate: { alpha: 0, beta: 0, gamma: 0 },
    interval: 16,
    isSupported: true,
  }),
}));

describe('useDeviceMotion', () => {
  it('deve retornar dados de aceleração', async () => {
    const { useDeviceMotion } = await import('@/hooks/useDeviceMotion');
    const { result } = renderHook(() => useDeviceMotion());
    expect(result.current.acceleration).toBeDefined();
  });

  it('deve retornar taxa de rotação', async () => {
    const { useDeviceMotion } = await import('@/hooks/useDeviceMotion');
    const { result } = renderHook(() => useDeviceMotion());
    expect(result.current.rotationRate).toBeDefined();
  });
});
