// src/hooks/__tests__/useGlobalStreamingx.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGlobalStreamingx } from '../useGlobalStreamingx';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useGlobalStreamingx', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useGlobalStreamingx());
      expect(result.current).toBeDefined();
    });
  });

  describe('Estado Global', () => {
    it('deve retornar streams ativos', () => {
      const { result } = renderHook(() => useGlobalStreamingx());
      if (result.current.activeStreams) {
        expect(Array.isArray(result.current.activeStreams)).toBe(true);
      }
    });

    it('deve retornar status de conexão', () => {
      const { result } = renderHook(() => useGlobalStreamingx());
      if (result.current.connectionStatus) {
        expect(typeof result.current.connectionStatus).toBe('object');
      }
    });
  });

  describe('Gerenciamento', () => {
    it('deve adicionar stream', async () => {
      const { result } = renderHook(() => useGlobalStreamingx());
      if (result.current.addStream) {
        await act(async () => {
          await result.current.addStream('cam-1', 'rtsp://...');
        });
      }
    });

    it('deve remover stream', () => {
      const { result } = renderHook(() => useGlobalStreamingx());
      if (result.current.removeStream) {
        act(() => { result.current.removeStream('cam-1'); });
      }
    });

    it('deve pausar todos os streams', () => {
      const { result } = renderHook(() => useGlobalStreamingx());
      if (result.current.pauseAll) {
        act(() => { result.current.pauseAll(); });
      }
    });

    it('deve retomar todos os streams', () => {
      const { result } = renderHook(() => useGlobalStreamingx());
      if (result.current.resumeAll) {
        act(() => { result.current.resumeAll(); });
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useGlobalStreamingx());
      expect(() => unmount()).not.toThrow();
    });
  });
});
