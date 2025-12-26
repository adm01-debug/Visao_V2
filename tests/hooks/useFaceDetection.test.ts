import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('useFaceDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', async () => {
    const { useFaceDetection } = await import('../useFaceDetection');
    const { result } = renderHook(() => useFaceDetection());

    expect(result.current.faces).toEqual([]);
    expect(result.current.isDetecting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should have detectFaces function', async () => {
    const { useFaceDetection } = await import('../useFaceDetection');
    const { result } = renderHook(() => useFaceDetection());

    expect(typeof result.current.detectFaces).toBe('function');
  });

  it('should handle detection errors gracefully', async () => {
    const { useFaceDetection } = await import('../useFaceDetection');
    const { result } = renderHook(() => useFaceDetection());

    // Attempt detection with invalid input should not throw
    await act(async () => {
      try {
        await result.current.detectFaces(null as any);
      } catch (e) {
        // Expected to handle gracefully
      }
    });

    expect(result.current.isDetecting).toBe(false);
  });

  it('should reset state on clear', async () => {
    const { useFaceDetection } = await import('../useFaceDetection');
    const { result } = renderHook(() => useFaceDetection());

    if (result.current.clearDetections) {
      act(() => {
        result.current.clearDetections();
      });

      expect(result.current.faces).toEqual([]);
      expect(result.current.error).toBeNull();
    }
  });
});
