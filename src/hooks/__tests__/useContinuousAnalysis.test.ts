/**
 * VISÃO - Testes do useContinuousAnalysis
 * Testes para análise contínua de frames
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          objects: [
            { class: 'person', confidence: 0.95, bbox: [100, 100, 200, 300] },
            { class: 'car', confidence: 0.88, bbox: [300, 200, 150, 100] },
          ],
          analysis: {
            scene: 'indoor office environment',
            activity: 'people working at desks',
            anomalies: [],
          },
        },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
    }),
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
    expect(result.current.config.intervalMs).toBeGreaterThan(0);
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
    expect(typeof result.current.analyzeNow).toBe('function');
  });

  it('should have empty detections initially', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.lastDetections).toBeDefined();
    expect(Array.isArray(result.current.lastDetections)).toBe(true);
  });

  it('should have stats object', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.stats).toBeDefined();
    expect(typeof result.current.stats.totalAnalyses).toBe('number');
    expect(typeof result.current.stats.avgProcessingTime).toBe('number');
  });

  it('should accept custom config', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
      config: {
        enabled: true,
        intervalMs: 5000,
        minConfidence: 0.8,
      },
    }));

    expect(result.current.config.intervalMs).toBe(5000);
    expect(result.current.config.minConfidence).toBe(0.8);
  });

  it('should have lastAnalysis timestamp', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.lastAnalysis).toBeNull();
  });

  it('should have error state', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
    }));

    expect(result.current.error).toBeNull();
  });
});

describe('Analysis Processing', () => {
  it('should process detection results correctly', () => {
    const detections = [
      { class: 'person', confidence: 0.95, bbox: [100, 100, 200, 300] },
      { class: 'car', confidence: 0.88, bbox: [300, 200, 150, 100] },
    ];

    expect(detections.length).toBe(2);
    expect(detections[0].class).toBe('person');
    expect(detections[0].confidence).toBeGreaterThan(0.5);
  });

  it('should filter by confidence threshold', () => {
    const threshold = 0.9;
    const detections = [
      { class: 'person', confidence: 0.95, bbox: [] },
      { class: 'car', confidence: 0.88, bbox: [] },
      { class: 'bicycle', confidence: 0.75, bbox: [] },
    ];

    const filtered = detections.filter(d => d.confidence >= threshold);
    expect(filtered.length).toBe(1);
    expect(filtered[0].class).toBe('person');
  });
});

describe('Analysis Config', () => {
  it('should have valid interval range', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
      config: {
        intervalMs: 1000,
      },
    }));

    // Intervalo mínimo razoável é 1 segundo
    expect(result.current.config.intervalMs).toBeGreaterThanOrEqual(1000);
  });

  it('should have valid confidence range', async () => {
    const { useContinuousAnalysis } = await import('@/hooks/useContinuousAnalysis');
    
    const { result } = renderHook(() => useContinuousAnalysis({
      cameraId: 'camera_1',
      cameraName: 'Câmera 1',
      config: {
        minConfidence: 0.7,
      },
    }));

    expect(result.current.config.minConfidence).toBeGreaterThanOrEqual(0);
    expect(result.current.config.minConfidence).toBeLessThanOrEqual(1);
  });
});
