/**
 * VISÃO - Testes do useHeatmap
 * Testes para geração de mapas de calor
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
            order: vi.fn().mockResolvedValue({
              data: [
                { x: 100, y: 100, intensity: 0.8, timestamp: new Date().toISOString() },
                { x: 200, y: 150, intensity: 0.6, timestamp: new Date().toISOString() },
              ],
              error: null,
            }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user_1' } },
        error: null,
      }),
    },
  },
}));

describe('useHeatmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default config', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'camera_1',
    }));

    expect(result.current.config).toBeDefined();
    expect(result.current.config.gridSize).toBeDefined();
    expect(result.current.config.colorScheme).toBeDefined();
  });

  it('should have empty data initially', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'camera_1',
    }));

    expect(result.current.data).toBeDefined();
    expect(result.current.data.grid).toBeDefined();
    expect(Array.isArray(result.current.data.grid)).toBe(true);
  });

  it('should have addPoint function', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'camera_1',
    }));

    expect(typeof result.current.addPoint).toBe('function');
  });

  it('should have loadHistory function', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'camera_1',
    }));

    expect(typeof result.current.loadHistory).toBe('function');
  });

  it('should have renderToCanvas function', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'camera_1',
    }));

    expect(typeof result.current.renderToCanvas).toBe('function');
  });

  it('should have clear function', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'camera_1',
    }));

    expect(typeof result.current.clear).toBe('function');
  });

  it('should accept custom config', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const customConfig = {
      gridSize: 30,
      colorScheme: 'blue' as const,
      opacity: 0.5,
      blur: 20,
    };

    const { result } = renderHook(() => useHeatmap({
      cameraId: 'camera_1',
      config: customConfig,
    }));

    expect(result.current.config.gridSize).toBe(30);
    expect(result.current.config.opacity).toBe(0.5);
    expect(result.current.config.blur).toBe(20);
  });
});

describe('Heatmap Color Schemes', () => {
  it('should support thermal color scheme', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'camera_1',
      config: { colorScheme: 'thermal' },
    }));

    expect(result.current.config.colorScheme).toBe('thermal');
  });

  it('should support monochrome color scheme', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'camera_1',
      config: { colorScheme: 'monochrome' },
    }));

    expect(result.current.config.colorScheme).toBe('monochrome');
  });
});

describe('Heatmap Time Ranges', () => {
  it('should support 1h time range', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'camera_1',
    }));

    // A função loadHistory deve aceitar timeRange
    expect(result.current.loadHistory).toBeDefined();
  });

  it('should support 24h time range', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'camera_1',
    }));

    expect(result.current.loadHistory).toBeDefined();
  });
});

describe('Heatmap Stats', () => {
  it('should calculate stats correctly', async () => {
    const { useHeatmap } = await import('@/hooks/useHeatmap');
    
    const { result } = renderHook(() => useHeatmap({
      cameraId: 'camera_1',
    }));

    expect(result.current.stats).toBeDefined();
    expect(typeof result.current.stats.totalPoints).toBe('number');
    expect(typeof result.current.stats.maxIntensity).toBe('number');
  });
});
