import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGeolocation } from '@/hooks/useGeolocation';

describe('useGeolocation', () => {
  beforeEach(() => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) => 
        success({ coords: { latitude: -23.55, longitude: -46.63 } })
      ),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };
    Object.defineProperty(navigator, 'geolocation', { value: mockGeolocation, writable: true });
  });

  it('deve verificar suporte', () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.isSupported).toBe(true);
  });

  it('deve obter posição atual', async () => {
    const { result } = renderHook(() => useGeolocation());
    await act(async () => { await result.current.getCurrentPosition(); });
    expect(result.current.latitude).toBeDefined();
    expect(result.current.longitude).toBeDefined();
  });

  it('deve lidar com erro', async () => {
    navigator.geolocation.getCurrentPosition = vi.fn().mockImplementation((_, error) => 
      error({ code: 1, message: 'Permission denied' })
    );
    const { result } = renderHook(() => useGeolocation());
    await act(async () => { await result.current.getCurrentPosition(); });
    expect(result.current.error).toBeDefined();
  });
});
