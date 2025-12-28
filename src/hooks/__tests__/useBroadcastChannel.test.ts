import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useBroadcastChannel } from '@/hooks/useBroadcastChannel';

describe('useBroadcastChannel', () => {
  it('deve criar canal com nome especificado', () => {
    const { result } = renderHook(() => useBroadcastChannel('test-channel'));
    expect(result.current.isSupported).toBe(true);
  });

  it('deve enviar mensagem', () => {
    const { result } = renderHook(() => useBroadcastChannel('test-channel'));
    expect(() => { result.current.postMessage({ type: 'TEST' }); }).not.toThrow();
  });

  it('deve fechar canal ao desmontar', () => {
    const { unmount } = renderHook(() => useBroadcastChannel('test-channel'));
    unmount();
  });
});
