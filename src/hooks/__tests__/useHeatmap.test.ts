/**
 * VISÃO - Testes: useHeatmap
 * 
 * Testes unitários para o hook de heatmap.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHeatmap } from '../useHeatmap';

// Mocks
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useHeatmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Inicialização', () => {
    it('deve inicializar com valores padrão', () => {
      const { result } = renderHook(() => useHeatmap('camera-1'));
      
      expect(result.current.isLoading).toBe(true);
      expect(result.current.heatmapData).toEqual([]);
    });

    it('deve aceitar cameraId como parâmetro', () => {
      const { result } = renderHook(() => useHeatmap('test-camera'));
      
      expect(result.current).toBeDefined();
    });
  });

  describe('Configuração', () => {
    it('deve ter configuração padrão correta', () => {
      const { result } = renderHook(() => useHeatmap('camera-1', {
        gridSize: 20,
        colorScheme: 'thermal',
      }));
      
      expect(result.current).toBeDefined();
    });

    it('deve permitir diferentes esquemas de cores', () => {
      const schemes = ['thermal', 'viridis', 'grayscale'] as const;
      
      schemes.forEach(scheme => {
        const { result } = renderHook(() => useHeatmap('camera-1', {
          colorScheme: scheme,
        }));
        
        expect(result.current).toBeDefined();
      });
    });
  });

  describe('Registro de dados', () => {
    it('deve expor função recordPoint', () => {
      const { result } = renderHook(() => useHeatmap('camera-1'));
      
      expect(typeof result.current.recordPoint).toBe('function');
    });

    it('deve expor função recordPoints', () => {
      const { result } = renderHook(() => useHeatmap('camera-1'));
      
      expect(typeof result.current.recordPoints).toBe('function');
    });
  });

  describe('Histórico', () => {
    it('deve expor função loadHistory', () => {
      const { result } = renderHook(() => useHeatmap('camera-1'));
      
      expect(typeof result.current.loadHistory).toBe('function');
    });
  });

  describe('Renderização', () => {
    it('deve expor função renderToCanvas', () => {
      const { result } = renderHook(() => useHeatmap('camera-1'));
      
      expect(typeof result.current.renderToCanvas).toBe('function');
    });

    it('deve expor função clearCanvas', () => {
      const { result } = renderHook(() => useHeatmap('camera-1'));
      
      expect(typeof result.current.clearCanvas).toBe('function');
    });
  });

  describe('Estatísticas', () => {
    it('deve calcular estatísticas do heatmap', () => {
      const { result } = renderHook(() => useHeatmap('camera-1'));
      
      expect(result.current.stats).toBeDefined();
      expect(typeof result.current.stats.totalPoints).toBe('number');
      expect(typeof result.current.stats.maxIntensity).toBe('number');
    });
  });

  describe('Real-time', () => {
    it('deve ter flag realTimeEnabled', () => {
      const { result } = renderHook(() => useHeatmap('camera-1'));
      
      expect(typeof result.current.realTimeEnabled).toBe('boolean');
    });
  });

  describe('Limpeza', () => {
    it('deve expor função reset', () => {
      const { result } = renderHook(() => useHeatmap('camera-1'));
      
      expect(typeof result.current.reset).toBe('function');
    });

    it('deve limpar dados ao chamar reset', () => {
      const { result } = renderHook(() => useHeatmap('camera-1'));
      
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.heatmapData).toEqual([]);
    });
  });
});
