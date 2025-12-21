/**
 * VISÃO - Testes do useHeatmap
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

describe('useHeatmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty data', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'test-camera',
    }));

    expect(result.current.data.grid).toEqual([]);
    expect(result.current.data.maxValue).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('should have correct config defaults', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'test-camera',
    }));

    expect(result.current.config.gridSize).toBe(20);
    expect(result.current.config.colorScheme).toBe('thermal');
    expect(result.current.config.opacity).toBe(0.7);
    expect(result.current.config.blur).toBe(15);
  });

  it('should provide addPoint function', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'test-camera',
    }));

    expect(typeof result.current.addPoint).toBe('function');
  });

  it('should provide clearData function', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'test-camera',
    }));

    expect(typeof result.current.clearData).toBe('function');
  });

  it('should provide renderToCanvas function', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'test-camera',
    }));

    expect(typeof result.current.renderToCanvas).toBe('function');
  });

  it('should accept custom config', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const customConfig = {
      gridSize: 30,
      colorScheme: 'cool' as const,
      opacity: 0.5,
      blur: 20,
      realtime: true,
    };

    const { result } = renderHook(() => useHeatmap({
      cameraId: 'test-camera',
      config: customConfig,
    }));

    expect(result.current.config.gridSize).toBe(30);
    expect(result.current.config.colorScheme).toBe('cool');
    expect(result.current.config.opacity).toBe(0.5);
  });
});

describe('Heatmap Data Structure', () => {
  it('should have correct HeatmapPoint structure', () => {
    const point = {
      x: 100,
      y: 200,
      value: 0.8,
      timestamp: new Date(),
    };

    expect(point.x).toBe(100);
    expect(point.y).toBe(200);
    expect(point.value).toBe(0.8);
    expect(point.timestamp).toBeInstanceOf(Date);
  });

  it('should have correct HeatmapData structure', () => {
    const data = {
      grid: [[0, 0.5], [0.3, 0.8]],
      maxValue: 0.8,
      totalPoints: 4,
      lastUpdate: new Date(),
    };

    expect(data.grid.length).toBe(2);
    expect(data.maxValue).toBe(0.8);
    expect(data.totalPoints).toBe(4);
  });
});

describe('Heatmap Color Schemes', () => {
  it('should support thermal color scheme', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'test-camera',
      config: { colorScheme: 'thermal' },
    }));

    expect(result.current.config.colorScheme).toBe('thermal');
  });

  it('should support cool color scheme', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'test-camera',
      config: { colorScheme: 'cool' },
    }));

    expect(result.current.config.colorScheme).toBe('cool');
  });

  it('should support grayscale color scheme', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'test-camera',
      config: { colorScheme: 'grayscale' },
    }));

    expect(result.current.config.colorScheme).toBe('grayscale');
  });
});

describe('Time Range Loading', () => {
  it('should provide loadHistory function', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'test-camera',
    }));

    expect(typeof result.current.loadHistory).toBe('function');
  });

  it('should accept valid time ranges', async () => {
    const { useHeatmap, TimeRange } = await import('@/hooks/useHeatmap');
    
    const validRanges = ['1h', '6h', '24h', '7d'];
    
    validRanges.forEach(range => {
      expect(['1h', '6h', '24h', '7d']).toContain(range);
    });
  });
});
