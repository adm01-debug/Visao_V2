import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useOffline } from '@/hooks/useOffline';

describe('useOffline', () => {
  it('deve retornar false quando online', () => {
    const { result } = renderHook(() => useOffline());
    expect(result.current).toBe(false);
  });

  it('deve retornar true quando offline', () => {
    const { result } = renderHook(() => useOffline());
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current).toBe(true);
  });

  it('deve atualizar ao reconectar', () => {
    const { result } = renderHook(() => useOffline());
    act(() => { window.dispatchEvent(new Event('offline')); });
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(result.current).toBe(false);
  });
});
