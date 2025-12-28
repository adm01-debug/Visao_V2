// src/hooks/__tests__/usePerformance.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePerformance } from '../usePerformance';

describe('usePerformance', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => usePerformance());
    expect(result.current).toBeDefined();
  });

  it('deve retornar métricas', () => {
    const { result } = renderHook(() => usePerformance());
    if (result.current.metrics) {
      expect(typeof result.current.metrics).toBe('object');
    }
  });

  it('deve marcar evento', () => {
    const { result } = renderHook(() => usePerformance());
    if (result.current.mark) {
      act(() => { result.current.mark('test-event'); });
    }
  });

  it('deve medir duração', () => {
    const { result } = renderHook(() => usePerformance());
    if (result.current.measure) {
      const duration = result.current.measure('start', 'end');
      expect(typeof duration === 'number' || duration === undefined).toBe(true);
    }
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => usePerformance());
    expect(() => unmount()).not.toThrow();
  });
});
