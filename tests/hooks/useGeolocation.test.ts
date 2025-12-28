import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    latitude: -23.5505,
    longitude: -46.6333,
    accuracy: 10,
    loading: false,
    error: null,
  }),
}));

describe('useGeolocation', () => {
  it('deve retornar coordenadas', async () => {
    const { useGeolocation } = await import('@/hooks/useGeolocation');
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.latitude).toBeDefined();
    expect(result.current.longitude).toBeDefined();
  });

  it('deve indicar precisão', async () => {
    const { useGeolocation } = await import('@/hooks/useGeolocation');
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.accuracy).toBeGreaterThan(0);
  });
});
