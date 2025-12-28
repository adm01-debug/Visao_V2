import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useWebSocket } from '@/hooks/useWebSocket';

describe('useWebSocket', () => {
  beforeEach(() => {
    global.WebSocket = vi.fn().mockImplementation(() => ({
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1,
    })) as any;
  });

  it('deve conectar', () => {
    const { result } = renderHook(() => useWebSocket('wss://test.com'));
    expect(result.current.readyState).toBeDefined();
  });

  it('deve enviar mensagem', () => {
    const { result } = renderHook(() => useWebSocket('wss://test.com'));
    act(() => { result.current.send('test'); });
  });

  it('deve desconectar', () => {
    const { result } = renderHook(() => useWebSocket('wss://test.com'));
    act(() => { result.current.close(); });
  });
});
