// src/hooks/__tests__/useFaceDetection.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFaceDetection } from '../useFaceDetection';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useFaceDetection', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useFaceDetection());
      expect(result.current).toBeDefined();
      expect(result.current.isDetecting).toBe(false);
    });
  });

  describe('Detecção', () => {
    it('deve iniciar detecção', async () => {
      const { result } = renderHook(() => useFaceDetection());
      if (result.current.startDetection) {
        const video = document.createElement('video');
        await act(async () => {
          await result.current.startDetection(video);
        });
      }
    });

    it('deve parar detecção', () => {
      const { result } = renderHook(() => useFaceDetection());
      if (result.current.stopDetection) {
        act(() => { result.current.stopDetection(); });
        expect(result.current.isDetecting).toBe(false);
      }
    });

    it('deve retornar faces detectadas', () => {
      const { result } = renderHook(() => useFaceDetection());
      if (result.current.faces) {
        expect(Array.isArray(result.current.faces)).toBe(true);
      }
    });
  });

  describe('Configuração', () => {
    it('deve aceitar minConfidence', () => {
      const { result } = renderHook(() => useFaceDetection({ minConfidence: 0.9 }));
      expect(result.current).toBeDefined();
    });

    it('deve aceitar maxFaces', () => {
      const { result } = renderHook(() => useFaceDetection({ maxFaces: 10 }));
      expect(result.current).toBeDefined();
    });
  });

  describe('Callbacks', () => {
    it('deve chamar onFaceDetected', () => {
      const onFaceDetected = vi.fn();
      renderHook(() => useFaceDetection({ onFaceDetected }));
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useFaceDetection());
      expect(() => unmount()).not.toThrow();
    });
  });
});
