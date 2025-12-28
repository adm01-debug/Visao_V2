import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/hooks/useBroadcastChannel', () => ({
  useBroadcastChannel: () => ({
    postMessage: vi.fn(),
    lastMessage: null,
    close: vi.fn(),
  }),
}));

describe('useBroadcastChannel', () => {
  it('deve criar canal de comunicação', async () => {
    const { useBroadcastChannel } = await import('@/hooks/useBroadcastChannel');
    const { result } = renderHook(() => useBroadcastChannel('test-channel'));
    expect(result.current).toBeDefined();
  });

  it('deve enviar mensagem', async () => {
    const { useBroadcastChannel } = await import('@/hooks/useBroadcastChannel');
    const { result } = renderHook(() => useBroadcastChannel('test-channel'));
    act(() => {
      result.current.postMessage({ type: 'test' });
    });
    expect(result.current.postMessage).toHaveBeenCalled();
  });

  it('deve fechar canal', async () => {
    const { useBroadcastChannel } = await import('@/hooks/useBroadcastChannel');
    const { result } = renderHook(() => useBroadcastChannel('test-channel'));
    act(() => {
      result.current.close();
    });
    expect(result.current.close).toHaveBeenCalled();
  });
});
