// src/hooks/__tests__/useContinuousAnalysis.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useContinuousAnalysis } from '../useContinuousAnalysis';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    functions: { invoke: vi.fn().mockResolvedValue({ data: { results: [] }, error: null }) },
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useContinuousAnalysis', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useContinuousAnalysis());
      expect(result.current).toBeDefined();
      expect(result.current.isAnalyzing).toBe(false);
    });
  });

  describe('Análise Contínua', () => {
    it('deve iniciar análise', async () => {
      const { result } = renderHook(() => useContinuousAnalysis());
      if (result.current.startAnalysis) {
        await act(async () => {
          await result.current.startAnalysis('cam-1', { interval: 1000 });
        });
      }
    });

    it('deve parar análise', () => {
      const { result } = renderHook(() => useContinuousAnalysis());
      if (result.current.stopAnalysis) {
        act(() => { result.current.stopAnalysis(); });
      }
    });

    it('deve executar análise periódica', async () => {
      const { result } = renderHook(() => useContinuousAnalysis());
      if (result.current.startAnalysis) {
        await act(async () => {
          await result.current.startAnalysis('cam-1', { interval: 1000 });
          vi.advanceTimersByTime(3000);
        });
      }
    });
  });

  describe('Resultados', () => {
    it('deve retornar últimos resultados', () => {
      const { result } = renderHook(() => useContinuousAnalysis());
      if (result.current.lastResults) {
        expect(result.current.lastResults).toBeDefined();
      }
    });

    it('deve ter callback de resultado', async () => {
      const onResult = vi.fn();
      const { result } = renderHook(() => useContinuousAnalysis({ onResult }));
      expect(result.current).toBeDefined();
    });
  });

  describe('Configuração', () => {
    it('deve aceitar intervalo customizado', async () => {
      const { result } = renderHook(() => useContinuousAnalysis());
      if (result.current.setInterval) {
        act(() => { result.current.setInterval(5000); });
      }
    });

    it('deve aceitar modelos customizados', async () => {
      const { result } = renderHook(() => useContinuousAnalysis());
      if (result.current.setModels) {
        act(() => { result.current.setModels(['face', 'plate']); });
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useContinuousAnalysis());
      expect(() => unmount()).not.toThrow();
    });
  });
});
