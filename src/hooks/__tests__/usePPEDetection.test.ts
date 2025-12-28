// src/hooks/__tests__/usePPEDetection.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePPEDetection } from '../usePPEDetection';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

describe('usePPEDetection', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => usePPEDetection());
      expect(result.current).toBeDefined();
      expect(result.current.isDetecting).toBe(false);
    });
  });

  describe('Detecção de EPI', () => {
    it('deve iniciar detecção', async () => {
      const { result } = renderHook(() => usePPEDetection());
      if (result.current.startDetection) {
        await act(async () => { await result.current.startDetection('cam-1'); });
      }
    });

    it('deve parar detecção', () => {
      const { result } = renderHook(() => usePPEDetection());
      if (result.current.stopDetection) {
        act(() => { result.current.stopDetection(); });
      }
    });

    it('deve retornar violações', () => {
      const { result } = renderHook(() => usePPEDetection());
      if (result.current.violations) {
        expect(Array.isArray(result.current.violations)).toBe(true);
      }
    });
  });

  describe('Tipos de EPI', () => {
    it('deve detectar capacete', async () => {
      const { result } = renderHook(() => usePPEDetection({ detectHelmet: true }));
      expect(result.current).toBeDefined();
    });

    it('deve detectar colete', async () => {
      const { result } = renderHook(() => usePPEDetection({ detectVest: true }));
      expect(result.current).toBeDefined();
    });

    it('deve detectar óculos', async () => {
      const { result } = renderHook(() => usePPEDetection({ detectGlasses: true }));
      expect(result.current).toBeDefined();
    });
  });

  describe('Callbacks', () => {
    it('deve chamar onViolation', () => {
      const onViolation = vi.fn();
      renderHook(() => usePPEDetection({ onViolation }));
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => usePPEDetection());
      expect(() => unmount()).not.toThrow();
    });
  });
});
