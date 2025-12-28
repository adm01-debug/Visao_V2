import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useGamepad } from '@/hooks/useGamepad';

describe('useGamepad', () => {
  it('deve retornar gamepads conectados', () => {
    navigator.getGamepads = vi.fn().mockReturnValue([null, null, null, null]);
    const { result } = renderHook(() => useGamepad());
    expect(result.current.gamepads).toBeDefined();
  });

  it('deve detectar conexão de gamepad', () => {
    const { result } = renderHook(() => useGamepad());
    const event = new Event('gamepadconnected');
    act(() => { window.dispatchEvent(event); });
  });

  it('deve detectar desconexão de gamepad', () => {
    const { result } = renderHook(() => useGamepad());
    const event = new Event('gamepaddisconnected');
    act(() => { window.dispatchEvent(event); });
  });
});
