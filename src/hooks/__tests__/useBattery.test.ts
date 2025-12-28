import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBattery } from '@/hooks/useBattery';

describe('useBattery', () => {
  let mockBattery: any;

  beforeEach(() => {
    mockBattery = {
      charging: true,
      chargingTime: 3600,
      dischargingTime: Infinity,
      level: 0.8,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    (navigator as any).getBattery = vi.fn().mockResolvedValue(mockBattery);
  });

  it('deve retornar status da bateria', async () => {
    const { result } = renderHook(() => useBattery());
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(result.current.isSupported).toBe(true);
  });

  it('deve indicar nível da bateria', async () => {
    const { result } = renderHook(() => useBattery());
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(result.current.level).toBeDefined();
  });

  it('deve indicar se está carregando', async () => {
    const { result } = renderHook(() => useBattery());
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect(result.current.charging).toBeDefined();
  });
});
