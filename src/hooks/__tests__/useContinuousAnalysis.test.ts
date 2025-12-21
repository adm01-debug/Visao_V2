/**
 * VISÃO - Testes do useContinuousAnalysis
 * Testes para análise contínua de vídeo
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: '1',
                    camera_id: 'camera_1',
                    analysis_type: 'object_detection',
                    results: { objects: [{ class: 'person', score: 0.95 }] },
                    timestamp: new Date().toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { objects: [{ class: 'person', score: 0.95 }] },
        error: null,
      }),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user_1' } },
        error: null,
      }),
    },
  },
}));

describe('useContinuousAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with default config', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.config).toBeDefined();
    expect(result.current.config.enabled).toBe(true);
    expect(result.current.config.analysisInterval).toBeGreaterThan(0);
  });

  it('should not be running initially', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.isRunning).toBe(false);
  });

  it('should have control functions', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.stop).toBe('function');
    expect(typeof result.current.toggle).toBe('function');
  });

  it('should have stats with initial values', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.stats).toBeDefined();
    expect(typeof result.current.stats.totalAnalyses).toBe('number');
    expect(typeof result.current.stats.alertsGenerated).toBe('number');
    expect(typeof result.current.stats.avgProcessingTime).toBe('number');
  });

  it('should have empty recent analyses initially', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.recentAnalyses).toBeDefined();
    expect(Array.isArray(result.current.recentAnalyses)).toBe(true);
  });

  it('should have videoRef', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.videoRef).toBeDefined();
  });

  it('should accept custom config', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
      config: {
        enabled: true,
        analysisInterval: 5000,
        analysisTypes: ['object_detection', 'face_detection'],
        minConfidence: 0.8,
      },
    }));

    expect(result.current.config.analysisInterval).toBe(5000);
    expect(result.current.config.minConfidence).toBe(0.8);
    expect(result.current.config.analysisTypes).toContain('object_detection');
    expect(result.current.config.analysisTypes).toContain('face_detection');
  });
});

describe('Analysis Types', () => {
  it('should support object detection', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
      config: {
        analysisTypes: ['object_detection'],
      },
    }));

    expect(result.current.config.analysisTypes).toContain('object_detection');
  });

  it('should support face detection', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
      config: {
        analysisTypes: ['face_detection'],
      },
    }));

    expect(result.current.config.analysisTypes).toContain('face_detection');
  });

  it('should support motion detection', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
      config: {
        analysisTypes: ['motion_detection'],
      },
    }));

    expect(result.current.config.analysisTypes).toContain('motion_detection');
  });
});
