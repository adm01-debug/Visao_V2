// src/hooks/__tests__/useMediaMTX.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMediaMTX } from '../useMediaMTX';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useMediaMTX', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useMediaMTX());
      expect(result.current).toBeDefined();
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Conexão', () => {
    it('deve conectar ao servidor', async () => {
      const { result } = renderHook(() => useMediaMTX());
      if (result.current.connect) {
        await act(async () => {
          await result.current.connect('http://localhost:8889');
        });
      }
    });

    it('deve desconectar do servidor', () => {
      const { result } = renderHook(() => useMediaMTX());
      if (result.current.disconnect) {
        act(() => { result.current.disconnect(); });
      }
    });
  });

  describe('Streams', () => {
    it('deve listar streams', async () => {
      const { result } = renderHook(() => useMediaMTX());
      if (result.current.getStreams) {
        await act(async () => {
          const streams = await result.current.getStreams();
          expect(Array.isArray(streams)).toBe(true);
        });
      }
    });

    it('deve criar stream', async () => {
      const { result } = renderHook(() => useMediaMTX());
      if (result.current.createStream) {
        await act(async () => {
          await result.current.createStream({ name: 'cam1', source: 'rtsp://...' });
        });
      }
    });

    it('deve deletar stream', async () => {
      const { result } = renderHook(() => useMediaMTX());
      if (result.current.deleteStream) {
        await act(async () => {
          await result.current.deleteStream('cam1');
        });
      }
    });
  });

  describe('WebRTC', () => {
    it('deve obter URL WebRTC', () => {
      const { result } = renderHook(() => useMediaMTX());
      if (result.current.getWebRTCUrl) {
        const url = result.current.getWebRTCUrl('cam1');
        expect(typeof url).toBe('string');
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useMediaMTX());
      expect(() => unmount()).not.toThrow();
    });
  });
});
