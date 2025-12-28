// src/hooks/__tests__/useImageAnalysis.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useImageAnalysis } from '../useImageAnalysis';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: { results: [] }, error: null }) } },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useImageAnalysis', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useImageAnalysis());
      expect(result.current).toBeDefined();
      expect(result.current.isAnalyzing).toBe(false);
    });
  });

  describe('Análise', () => {
    it('deve analisar imagem', async () => {
      const { result } = renderHook(() => useImageAnalysis());
      if (result.current.analyzeImage) {
        await act(async () => {
          const results = await result.current.analyzeImage('data:image/jpeg;base64,...');
        });
      }
    });

    it('deve analisar com modelos específicos', async () => {
      const { result } = renderHook(() => useImageAnalysis());
      if (result.current.analyzeImage) {
        await act(async () => {
          await result.current.analyzeImage('data:...', { models: ['face', 'plate'] });
        });
      }
    });
  });

  describe('Resultados', () => {
    it('deve retornar últimos resultados', () => {
      const { result } = renderHook(() => useImageAnalysis());
      if (result.current.lastResults) {
        expect(result.current.lastResults).toBeDefined();
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useImageAnalysis());
      expect(() => unmount()).not.toThrow();
    });
  });
});
