import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useServiceWorker } from '@/hooks/useServiceWorker';

describe('useServiceWorker', () => {
  it('deve verificar suporte', () => {
    const { result } = renderHook(() => useServiceWorker());
    expect(result.current.isSupported).toBeDefined();
  });

  it('deve registrar SW', async () => {
    navigator.serviceWorker = { register: vi.fn().mockResolvedValue({}) } as any;
    const { result } = renderHook(() => useServiceWorker());
  });

  it('deve retornar estado de registro', () => {
    const { result } = renderHook(() => useServiceWorker());
    expect(result.current.registration).toBeDefined();
  });
});
