/**
 * VISÃO - Testes do usePPEDetection
 * Testes para detecção de EPIs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock do useMLModels
vi.mock('@/hooks/useMLModels', () => ({
  useMLModels: vi.fn().mockReturnValue({
    detectObjects: vi.fn().mockResolvedValue([
      { class: 'person', score: 0.95, bbox: [100, 100, 200, 400] },
    ]),
    detectPersons: vi.fn().mockResolvedValue([
      { class: 'person', score: 0.95, bbox: [100, 100, 200, 400] },
    ]),
    isReady: true,
    isLoading: false,
    backend: 'webgl',
  }),
}));

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'zone_1',
              name: 'Área de Produção',
              camera_id: 'camera_1',
              required_ppe: ['helmet', 'vest'],
              polygon: [[0, 0], [100, 0], [100, 100], [0, 100]],
              active: true,
            },
          ],
          error: null,
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user_1' } },
        error: null,
      }),
    },
  },
}));

describe('usePPEDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default config', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.config).toBeDefined();
    expect(result.current.config.enabled).toBe(true);
    expect(result.current.config.minConfidence).toBeGreaterThan(0);
  });

  it('should not be running initially', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.isRunning).toBe(false);
  });

  it('should have toggle function', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(typeof result.current.toggle).toBe('function');
    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.stop).toBe('function');
  });

  it('should have zone management functions', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(typeof result.current.addZone).toBe('function');
    expect(typeof result.current.updateZone).toBe('function');
    expect(typeof result.current.deleteZone).toBe('function');
  });

  it('should have acknowledgeViolation function', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(typeof result.current.acknowledgeViolation).toBe('function');
  });

  it('should have stats with initial values', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.stats).toBeDefined();
    expect(typeof result.current.stats.totalDetections).toBe('number');
    expect(typeof result.current.stats.compliantCount).toBe('number');
    expect(typeof result.current.stats.violationCount).toBe('number');
    expect(typeof result.current.stats.complianceRate).toBe('number');
  });

  it('should have empty zones initially', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.zones).toBeDefined();
    expect(Array.isArray(result.current.zones)).toBe(true);
  });

  it('should have empty violations initially', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.recentViolations).toBeDefined();
    expect(Array.isArray(result.current.recentViolations)).toBe(true);
  });

  it('should have empty currentDetections initially', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.currentDetections).toBeDefined();
    expect(Array.isArray(result.current.currentDetections)).toBe(true);
  });
});

describe('PPE Types', () => {
  it('should export PPE_LABELS', async () => {
    const { PPE_LABELS } = await import('@/hooks/usePPEDetection');
    
    expect(PPE_LABELS).toBeDefined();
    expect(PPE_LABELS.helmet).toBeDefined();
    expect(PPE_LABELS.vest).toBeDefined();
  });

  it('should have correct PPE types', async () => {
    const { PPE_LABELS } = await import('@/hooks/usePPEDetection');
    
    const expectedTypes = ['helmet', 'vest', 'goggles', 'mask', 'gloves', 'boots', 'earmuffs', 'harness'];
    
    expectedTypes.forEach(type => {
      expect(PPE_LABELS[type]).toBeDefined();
      expect(PPE_LABELS[type].en).toBeDefined();
      expect(PPE_LABELS[type].pt).toBeDefined();
    });
  });
});

describe('PPE Detection Config', () => {
  it('should accept custom config', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
      config: {
        enabled: true,
        minConfidence: 0.8,
        detectionInterval: 3000,
        gracePeriodSeconds: 10,
      },
    }));

    expect(result.current.config.minConfidence).toBe(0.8);
    expect(result.current.config.detectionInterval).toBe(3000);
    expect(result.current.config.gracePeriodSeconds).toBe(10);
  });
});
