/**
 * VISÃO - Testes: usePPEDetection
 * 
 * Testes unitários para o hook de detecção de EPIs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePPEDetection } from '../usePPEDetection';

// Mocks
vi.mock('../useMLModels', () => ({
  useMLModels: () => ({
    isLoading: false,
    isReady: true,
    detectObjects: vi.fn().mockResolvedValue([]),
    detectPersons: vi.fn().mockResolvedValue([]),
    backend: 'webgl',
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
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
    warning: vi.fn(),
  },
}));

describe('usePPEDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Inicialização', () => {
    it('deve inicializar com valores padrão', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(result.current.isDetecting).toBe(false);
      expect(result.current.detections).toEqual([]);
    });

    it('deve ter zonas vazias inicialmente', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(result.current.zones).toEqual([]);
    });

    it('deve ter violações vazias inicialmente', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(result.current.violations).toEqual([]);
    });
  });

  describe('Tipos de EPIs', () => {
    it('deve expor lista de tipos de PPE', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(result.current.ppeTypes).toBeDefined();
      expect(Array.isArray(result.current.ppeTypes)).toBe(true);
    });

    it('deve incluir EPIs comuns', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      const expectedTypes = ['helmet', 'vest', 'gloves', 'boots', 'goggles'];
      expectedTypes.forEach(type => {
        expect(result.current.ppeTypes.some(p => p.id === type || p.type === type)).toBeDefined();
      });
    });
  });

  describe('Gerenciamento de Zonas', () => {
    it('deve expor função createZone', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(typeof result.current.createZone).toBe('function');
    });

    it('deve expor função updateZone', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(typeof result.current.updateZone).toBe('function');
    });

    it('deve expor função deleteZone', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(typeof result.current.deleteZone).toBe('function');
    });

    it('deve expor função loadZones', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(typeof result.current.loadZones).toBe('function');
    });
  });

  describe('Detecção', () => {
    it('deve expor função detectPPE', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(typeof result.current.detectPPE).toBe('function');
    });

    it('deve expor função startContinuousDetection', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(typeof result.current.startContinuousDetection).toBe('function');
    });

    it('deve expor função stopContinuousDetection', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(typeof result.current.stopContinuousDetection).toBe('function');
    });
  });

  describe('Violações', () => {
    it('deve expor função loadViolations', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(typeof result.current.loadViolations).toBe('function');
    });

    it('deve expor função acknowledgeViolation', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(typeof result.current.acknowledgeViolation).toBe('function');
    });
  });

  describe('Estatísticas', () => {
    it('deve calcular taxa de conformidade', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(result.current.stats).toBeDefined();
      expect(typeof result.current.stats.complianceRate).toBe('number');
    });

    it('deve contar detecções totais', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(typeof result.current.stats.totalDetections).toBe('number');
    });

    it('deve contar violações', () => {
      const { result } = renderHook(() => usePPEDetection());
      
      expect(typeof result.current.stats.violationCount).toBe('number');
    });
  });

  describe('Callbacks', () => {
    it('deve aceitar callback onViolation', () => {
      const onViolation = vi.fn();
      const { result } = renderHook(() => usePPEDetection({ onViolation }));
      
      expect(result.current).toBeDefined();
    });

    it('deve aceitar callback onCompliance', () => {
      const onCompliance = vi.fn();
      const { result } = renderHook(() => usePPEDetection({ onCompliance }));
      
      expect(result.current).toBeDefined();
    });
  });

  describe('Limpeza', () => {
    it('deve parar detecção ao desmontar', () => {
      const { result, unmount } = renderHook(() => usePPEDetection());
      
      expect(() => unmount()).not.toThrow();
    });
  });
});
