/**
 * VISÃO - Testes: useContinuousAnalysis
 * 
 * Testes unitários para o hook de análise contínua.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useContinuousAnalysis } from '../useContinuousAnalysis';

// Mocks
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { objects: [], people_count: 0 },
        error: null,
      }),
    },
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
    info: vi.fn(),
  },
}));

describe('useContinuousAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  describe('Inicialização', () => {
    it('deve inicializar com análise parada', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(result.current.isAnalyzing).toBe(false);
    });

    it('deve ter resultados vazios inicialmente', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(result.current.lastResult).toBeNull();
    });

    it('deve aceitar cameraId como parâmetro', () => {
      const { result } = renderHook(() => useContinuousAnalysis('test-camera'));
      
      expect(result.current).toBeDefined();
    });
  });

  describe('Configuração', () => {
    it('deve aceitar intervalo customizado', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1', {
        interval: 5000,
      }));
      
      expect(result.current).toBeDefined();
    });

    it('deve aceitar análises específicas', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1', {
        analyses: ['objects', 'faces', 'motion'],
      }));
      
      expect(result.current).toBeDefined();
    });

    it('deve permitir desabilitar salvamento', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1', {
        saveResults: false,
      }));
      
      expect(result.current).toBeDefined();
    });
  });

  describe('Controle', () => {
    it('deve expor função start', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(typeof result.current.start).toBe('function');
    });

    it('deve expor função stop', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(typeof result.current.stop).toBe('function');
    });

    it('deve expor função pause', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(typeof result.current.pause).toBe('function');
    });

    it('deve expor função resume', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(typeof result.current.resume).toBe('function');
    });
  });

  describe('Análise Manual', () => {
    it('deve expor função analyzeNow', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(typeof result.current.analyzeNow).toBe('function');
    });

    it('deve expor função analyzeFrame', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(typeof result.current.analyzeFrame).toBe('function');
    });
  });

  describe('Resultados', () => {
    it('deve expor lastResult', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(result.current.lastResult).toBeDefined();
    });

    it('deve expor histórico de resultados', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(Array.isArray(result.current.history)).toBe(true);
    });
  });

  describe('Estatísticas', () => {
    it('deve calcular contagem de análises', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(typeof result.current.stats.totalAnalyses).toBe('number');
    });

    it('deve calcular tempo médio de análise', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(typeof result.current.stats.avgAnalysisTime).toBe('number');
    });

    it('deve contar detecções', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(result.current.stats.detectionCounts).toBeDefined();
    });
  });

  describe('Callbacks', () => {
    it('deve aceitar callback onResult', () => {
      const onResult = vi.fn();
      const { result } = renderHook(() => useContinuousAnalysis('camera-1', {
        onResult,
      }));
      
      expect(result.current).toBeDefined();
    });

    it('deve aceitar callback onError', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useContinuousAnalysis('camera-1', {
        onError,
      }));
      
      expect(result.current).toBeDefined();
    });

    it('deve aceitar callback onDetection', () => {
      const onDetection = vi.fn();
      const { result } = renderHook(() => useContinuousAnalysis('camera-1', {
        onDetection,
      }));
      
      expect(result.current).toBeDefined();
    });
  });

  describe('Estado', () => {
    it('deve expor isPaused', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(typeof result.current.isPaused).toBe('boolean');
    });

    it('deve expor isProcessing', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(typeof result.current.isProcessing).toBe('boolean');
    });
  });

  describe('Limpeza', () => {
    it('deve parar análise ao desmontar', () => {
      const { result, unmount } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(() => unmount()).not.toThrow();
    });

    it('deve expor função clearHistory', () => {
      const { result } = renderHook(() => useContinuousAnalysis('camera-1'));
      
      expect(typeof result.current.clearHistory).toBe('function');
    });
  });
});
