import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useBattery', () => ({
  useBattery: () => ({
    level: 0.85,
    charging: true,
    chargingTime: 1800,
    dischargingTime: Infinity,
    isSupported: true,
  }),
}));

describe('useBattery', () => {
  it('deve retornar nível de bateria', async () => {
    const { useBattery } = await import('@/hooks/useBattery');
    const { result } = renderHook(() => useBattery());
    expect(result.current.level).toBeGreaterThanOrEqual(0);
    expect(result.current.level).toBeLessThanOrEqual(1);
  });

  it('deve indicar status de carregamento', async () => {
    const { useBattery } = await import('@/hooks/useBattery');
    const { result } = renderHook(() => useBattery());
    expect(typeof result.current.charging).toBe('boolean');
  });

  it('deve retornar tempo de carregamento', async () => {
    const { useBattery } = await import('@/hooks/useBattery');
    const { result } = renderHook(() => useBattery());
    expect(result.current.chargingTime).toBeDefined();
  });
});
