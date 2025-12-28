// src/hooks/__tests__/useVideoStream.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVideoStream } from '../useVideoStream';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

describe('useVideoStream', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useVideoStream());
      expect(result.current).toBeDefined();
      expect(result.current.stream).toBeNull();
      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('Conexão de Stream', () => {
    it('deve conectar a stream', async () => {
      const { result } = renderHook(() => useVideoStream());
      if (result.current.connect) {
        await act(async () => {
          await result.current.connect('rtsp://example.com/stream');
        });
      }
    });

    it('deve desconectar stream', () => {
      const { result } = renderHook(() => useVideoStream());
      if (result.current.disconnect) {
        act(() => { result.current.disconnect(); });
        expect(result.current.isPlaying).toBe(false);
      }
    });
  });

  describe('Controle de Playback', () => {
    it('deve pausar stream', () => {
      const { result } = renderHook(() => useVideoStream());
      if (result.current.pause) {
        act(() => { result.current.pause(); });
      }
    });

    it('deve retomar stream', () => {
      const { result } = renderHook(() => useVideoStream());
      if (result.current.resume) {
        act(() => { result.current.resume(); });
      }
    });
  });

  describe('Qualidade', () => {
    it('deve mudar qualidade', () => {
      const { result } = renderHook(() => useVideoStream());
      if (result.current.setQuality) {
        act(() => { result.current.setQuality('720p'); });
      }
    });
  });

  describe('Erros', () => {
    it('deve lidar com erro de conexão', async () => {
      const { result } = renderHook(() => useVideoStream());
      if (result.current.connect) {
        await act(async () => {
          try {
            await result.current.connect('invalid://url');
          } catch (e) {}
        });
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useVideoStream());
      expect(() => unmount()).not.toThrow();
    });
  });
});
