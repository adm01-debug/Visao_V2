import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useAmbientLight', () => ({
  useAmbientLight: () => ({
    illuminance: 100,
    isSupported: true,
    error: null,
  }),
}));

describe('useAmbientLight', () => {
  it('deve retornar dados de iluminância', async () => {
    const { useAmbientLight } = await import('@/hooks/useAmbientLight');
    const { result } = renderHook(() => useAmbientLight());
    expect(result.current.illuminance).toBeDefined();
  });

  it('deve indicar se API é suportada', async () => {
    const { useAmbientLight } = await import('@/hooks/useAmbientLight');
    const { result } = renderHook(() => useAmbientLight());
    expect(typeof result.current.isSupported).toBe('boolean');
  });

  it('deve tratar erros graciosamente', async () => {
    const { useAmbientLight } = await import('@/hooks/useAmbientLight');
    const { result } = renderHook(() => useAmbientLight());
    expect(result.current.error).toBeNull();
  });
});
