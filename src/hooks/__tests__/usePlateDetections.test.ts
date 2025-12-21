import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ 
          data: [
            { id: '1', plate_number: 'ABC-1234', confidence: 0.95, created_at: new Date().toISOString() }
          ], 
          error: null 
        })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: { id: '2' }, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

describe('usePlateDetections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', async () => {
    const { usePlateDetections } = await import('../usePlateDetections');
    const { result } = renderHook(() => usePlateDetections());

    expect(result.current.detections).toBeDefined();
    expect(result.current.registeredPlates).toBeDefined();
    expect(result.current.loading).toBeDefined();
  });

  it('should have detection functions', async () => {
    const { usePlateDetections } = await import('../usePlateDetections');
    const { result } = renderHook(() => usePlateDetections());

    expect(typeof result.current.detectPlate).toBe('function');
  });

  it('should have plate registration functions', async () => {
    const { usePlateDetections } = await import('../usePlateDetections');
    const { result } = renderHook(() => usePlateDetections());

    expect(typeof result.current.registerPlate).toBe('function');
    expect(typeof result.current.updatePlate).toBe('function');
    expect(typeof result.current.deletePlate).toBe('function');
  });

  it('should have blacklist/whitelist functions', async () => {
    const { usePlateDetections } = await import('../usePlateDetections');
    const { result } = renderHook(() => usePlateDetections());

    expect(typeof result.current.addToBlacklist).toBe('function');
    expect(typeof result.current.addToWhitelist).toBe('function');
  });

  it('should fetch detections', async () => {
    const { usePlateDetections } = await import('../usePlateDetections');
    const { result } = renderHook(() => usePlateDetections());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(Array.isArray(result.current.detections)).toBe(true);
  });
});
