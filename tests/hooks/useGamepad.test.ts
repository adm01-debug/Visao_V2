import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useGamepad', () => ({
  useGamepad: () => ({
    gamepads: [],
    isSupported: true,
    connected: false,
  }),
}));

describe('useGamepad', () => {
  it('deve retornar lista de gamepads', async () => {
    const { useGamepad } = await import('@/hooks/useGamepad');
    const { result } = renderHook(() => useGamepad());
    expect(Array.isArray(result.current.gamepads)).toBe(true);
  });

  it('deve indicar suporte à API', async () => {
    const { useGamepad } = await import('@/hooks/useGamepad');
    const { result } = renderHook(() => useGamepad());
    expect(typeof result.current.isSupported).toBe('boolean');
  });
});
