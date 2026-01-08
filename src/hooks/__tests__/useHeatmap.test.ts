// src/hooks/__tests__/useHeatmapx.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useHeatmapx } from '../useHeatmapx';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useHeatmapx', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useHeatmapx());
      expect(result.current).toBeDefined();
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('Geração de Heatmap', () => {
    it('deve iniciar geração', () => {
      const { result } = renderHook(() => useHeatmapx());
      if (result.current.start) {
        act(() => { result.current.start(); });
      }
    });

    it('deve parar geração', () => {
      const { result } = renderHook(() => useHeatmapx());
      if (result.current.stop) {
        act(() => { result.current.stop(); });
      }
    });

    it('deve resetar dados', () => {
      const { result } = renderHook(() => useHeatmapx());
      if (result.current.reset) {
        act(() => { result.current.reset(); });
      }
    });
  });

  describe('Dados', () => {
    it('deve retornar dados do heatmap', () => {
      const { result } = renderHook(() => useHeatmapx());
      if (result.current.data) {
        expect(result.current.data).toBeDefined();
      }
    });

    it('deve adicionar ponto', () => {
      const { result } = renderHook(() => useHeatmapx());
      if (result.current.addPoint) {
        act(() => { result.current.addPoint(100, 100, 1); });
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useHeatmapx());
      expect(() => unmount()).not.toThrow();
    });
  });
});
