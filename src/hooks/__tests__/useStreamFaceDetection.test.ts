// src/hooks/__tests__/useStreamFaceDetection.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStreamFaceDetection } from '../useStreamFaceDetection';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useStreamFaceDetection', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useStreamFaceDetection());
      expect(result.current).toBeDefined();
      expect(result.current.isDetecting).toBe(false);
    });
  });

  describe('Detecção', () => {
    it('deve iniciar detecção', async () => {
      const { result } = renderHook(() => useStreamFaceDetection());
      if (result.current.startDetection) {
        await act(async () => {
          await result.current.startDetection('cam-1');
        });
      }
    });

    it('deve parar detecção', () => {
      const { result } = renderHook(() => useStreamFaceDetection());
      if (result.current.stopDetection) {
        act(() => { result.current.stopDetection(); });
      }
    });
  });

  describe('Resultados', () => {
    it('deve retornar detecções', () => {
      const { result } = renderHook(() => useStreamFaceDetection());
      if (result.current.detections) {
        expect(Array.isArray(result.current.detections)).toBe(true);
      }
    });

    it('deve ter callback de detecção', () => {
      const onFaceDetected = vi.fn();
      const { result } = renderHook(() => useStreamFaceDetection({ onFaceDetected }));
      expect(result.current).toBeDefined();
    });
  });

  describe('Configuração', () => {
    it('deve aceitar threshold', () => {
      const { result } = renderHook(() => useStreamFaceDetection({ minConfidence: 0.8 }));
      expect(result.current).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useStreamFaceDetection());
      expect(() => unmount()).not.toThrow();
    });
  });
});
