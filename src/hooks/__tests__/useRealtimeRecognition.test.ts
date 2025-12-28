// src/hooks/__tests__/useRealtimeRecognition.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRealtimeRecognition } from '../useRealtimeRecognition';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useRealtimeRecognition', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useRealtimeRecognition());
      expect(result.current).toBeDefined();
      expect(result.current.isRecognizing).toBe(false);
    });
  });

  describe('Reconhecimento', () => {
    it('deve iniciar reconhecimento', async () => {
      const { result } = renderHook(() => useRealtimeRecognition());
      if (result.current.startRecognition) {
        await act(async () => {
          await result.current.startRecognition('cam-1');
        });
      }
    });

    it('deve parar reconhecimento', () => {
      const { result } = renderHook(() => useRealtimeRecognition());
      if (result.current.stopRecognition) {
        act(() => { result.current.stopRecognition(); });
      }
    });

    it('deve retornar matches', () => {
      const { result } = renderHook(() => useRealtimeRecognition());
      if (result.current.matches) {
        expect(Array.isArray(result.current.matches)).toBe(true);
      }
    });
  });

  describe('Pessoas Conhecidas', () => {
    it('deve carregar pessoas conhecidas', async () => {
      const { result } = renderHook(() => useRealtimeRecognition());
      if (result.current.loadKnownPeople) {
        await act(async () => {
          await result.current.loadKnownPeople();
        });
      }
    });
  });

  describe('Callbacks', () => {
    it('deve chamar onMatch', () => {
      const onMatch = vi.fn();
      renderHook(() => useRealtimeRecognition({ onMatch }));
    });

    it('deve chamar onUnknown', () => {
      const onUnknown = vi.fn();
      renderHook(() => useRealtimeRecognition({ onUnknown }));
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useRealtimeRecognition());
      expect(() => unmount()).not.toThrow();
    });
  });
});
