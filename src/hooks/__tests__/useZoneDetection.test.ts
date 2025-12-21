import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

describe('useZoneDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', async () => {
    const { useZoneDetection } = await import('../useZoneDetection');
    const { result } = renderHook(() => useZoneDetection());

    expect(result.current.zones).toBeDefined();
    expect(result.current.activeZones).toBeDefined();
    expect(result.current.loading).toBeDefined();
  });

  it('should have zone CRUD functions', async () => {
    const { useZoneDetection } = await import('../useZoneDetection');
    const { result } = renderHook(() => useZoneDetection());

    expect(typeof result.current.createZone).toBe('function');
    expect(typeof result.current.updateZone).toBe('function');
    expect(typeof result.current.deleteZone).toBe('function');
  });

  it('should have detection functions', async () => {
    const { useZoneDetection } = await import('../useZoneDetection');
    const { result } = renderHook(() => useZoneDetection());

    expect(typeof result.current.checkPointInZone).toBe('function');
    expect(typeof result.current.detectZoneEvents).toBe('function');
  });

  it('should correctly check if point is in zone', async () => {
    const { useZoneDetection } = await import('../useZoneDetection');
    const { result } = renderHook(() => useZoneDetection());

    const testZone = {
      id: 'test',
      name: 'Test Zone',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
    };

    // Point inside zone
    const insideResult = result.current.checkPointInZone(
      { x: 50, y: 50 },
      testZone as any
    );

    // Point outside zone
    const outsideResult = result.current.checkPointInZone(
      { x: 150, y: 150 },
      testZone as any
    );

    expect(insideResult).toBe(true);
    expect(outsideResult).toBe(false);
  });
});
