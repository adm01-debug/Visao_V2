/**
 * VISÃO - Testes do usePPEDetection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock do useMLModels
vi.mock('@/hooks/useMLModels', () => ({
  useMLModels: vi.fn().mockReturnValue({
    detectObjects: vi.fn().mockResolvedValue([
      { class: 'person', score: 0.95, bbox: [100, 100, 80, 200] },
    ]),
    detectPersons: vi.fn().mockResolvedValue([
      { class: 'person', score: 0.95, bbox: [100, 100, 80, 200] },
    ]),
    isReady: true,
    isLoading: false,
  }),
}));

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  },
}));

describe('usePPEDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct defaults', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'test-camera',
      cameraName: 'Test Camera',
    }));

    expect(result.current.isRunning).toBe(false);
    expect(result.current.zones).toEqual([]);
    expect(result.current.currentDetections).toEqual([]);
    expect(result.current.recentViolations).toEqual([]);
  });

  it('should have correct stats defaults', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'test-camera',
      cameraName: 'Test Camera',
    }));

    expect(result.current.stats.totalDetections).toBe(0);
    expect(result.current.stats.compliantCount).toBe(0);
    expect(result.current.stats.violationCount).toBe(0);
    expect(result.current.stats.complianceRate).toBe(100);
  });

  it('should provide toggle function', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'test-camera',
      cameraName: 'Test Camera',
    }));

    expect(typeof result.current.toggle).toBe('function');
  });

  it('should provide addZone function', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'test-camera',
      cameraName: 'Test Camera',
    }));

    expect(typeof result.current.addZone).toBe('function');
  });

  it('should provide deleteZone function', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'test-camera',
      cameraName: 'Test Camera',
    }));

    expect(typeof result.current.deleteZone).toBe('function');
  });

  it('should provide acknowledgeViolation function', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'test-camera',
      cameraName: 'Test Camera',
    }));

    expect(typeof result.current.acknowledgeViolation).toBe('function');
  });
});

describe('PPE Types', () => {
  it('should have correct PPE type labels', async () => {
    const { PPE_LABELS } = await import('@/hooks/usePPEDetection');
    
    expect(PPE_LABELS.helmet).toBeDefined();
    expect(PPE_LABELS.vest).toBeDefined();
    expect(PPE_LABELS.goggles).toBeDefined();
    expect(PPE_LABELS.mask).toBeDefined();
    expect(PPE_LABELS.gloves).toBeDefined();
    expect(PPE_LABELS.boots).toBeDefined();
  });

  it('should have Portuguese labels', async () => {
    const { PPE_LABELS } = await import('@/hooks/usePPEDetection');
    
    expect(PPE_LABELS.helmet.pt).toBe('Capacete');
    expect(PPE_LABELS.vest.pt).toBe('Colete');
    expect(PPE_LABELS.goggles.pt).toBe('Óculos');
    expect(PPE_LABELS.mask.pt).toBe('Máscara');
    expect(PPE_LABELS.gloves.pt).toBe('Luvas');
    expect(PPE_LABELS.boots.pt).toBe('Botas');
  });

  it('should have English labels', async () => {
    const { PPE_LABELS } = await import('@/hooks/usePPEDetection');
    
    expect(PPE_LABELS.helmet.en).toBe('Helmet');
    expect(PPE_LABELS.vest.en).toBe('Vest');
    expect(PPE_LABELS.goggles.en).toBe('Goggles');
    expect(PPE_LABELS.mask.en).toBe('Mask');
    expect(PPE_LABELS.gloves.en).toBe('Gloves');
    expect(PPE_LABELS.boots.en).toBe('Boots');
  });
});

describe('PPE Zone Configuration', () => {
  it('should have correct PPEZone structure', () => {
    const zone = {
      id: 'zone-1',
      name: 'Production Area',
      cameraId: 'cam-1',
      requiredPPE: ['helmet', 'vest'] as const,
      alertOnViolation: true,
      gracePeriodSeconds: 5,
      active: true,
    };

    expect(zone.requiredPPE).toContain('helmet');
    expect(zone.requiredPPE).toContain('vest');
    expect(zone.alertOnViolation).toBe(true);
    expect(zone.gracePeriodSeconds).toBe(5);
  });
});

describe('PPE Detection Configuration', () => {
  it('should accept custom config', async () => {
    const { usePPEDetection } = await import('@/hooks/usePPEDetection');
    
    const customConfig = {
      enabled: true,
      minConfidence: 0.7,
      detectionInterval: 3000,
      alertOnViolation: true,
      saveViolations: true,
      gracePeriodSeconds: 10,
    };

    const { result } = renderHook(() => usePPEDetection({
      cameraId: 'test-camera',
      cameraName: 'Test Camera',
      config: customConfig,
    }));

    expect(result.current.config.minConfidence).toBe(0.7);
    expect(result.current.config.detectionInterval).toBe(3000);
    expect(result.current.config.gracePeriodSeconds).toBe(10);
  });
});

describe('PPE Violation', () => {
  it('should have correct PPEViolation structure', () => {
    const violation = {
      id: 'viol-1',
      zoneId: 'zone-1',
      zoneName: 'Production',
      cameraId: 'cam-1',
      cameraName: 'Camera 1',
      personId: 'person-1',
      missingItems: ['helmet', 'vest'] as const,
      timestamp: new Date(),
      snapshotUrl: 'https://example.com/snapshot.jpg',
      acknowledged: false,
    };

    expect(violation.missingItems).toContain('helmet');
    expect(violation.acknowledged).toBe(false);
  });
});
