import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useNetworkState } from '@/hooks/useNetworkState';

describe('useNetworkState', () => {
  it('deve retornar estado online', () => {
    const { result } = renderHook(() => useNetworkState());
    expect(result.current.isOnline).toBeDefined();
  });

  it('deve atualizar ao ficar offline', () => {
    const { result } = renderHook(() => useNetworkState());
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current.isOnline).toBe(false);
  });

  it('deve atualizar ao ficar online', () => {
    const { result } = renderHook(() => useNetworkState());
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(result.current.isOnline).toBe(true);
  });

  it('deve retornar tipo de conexão', () => {
    const { result } = renderHook(() => useNetworkState());
    expect(result.current.effectiveType).toBeDefined();
  });
});
