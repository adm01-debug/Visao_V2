import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';

vi.mock('@/services/faceRecognitionService', () => ({
  detectFaces: vi.fn().mockResolvedValue([{ id: '1', confidence: 0.95 }]),
}));

describe('useFaceRecognition', () => {
  it('detects faces', async () => {
    const { result } = renderHook(() => useFaceRecognition());
    await waitFor(() => expect(result.current.detect).toBeDefined());
  });

  it('provides loading state', () => {
    const { result } = renderHook(() => useFaceRecognition());
    expect(result.current.loading).toBeDefined();
  });

  it('provides faces array', () => {
    const { result } = renderHook(() => useFaceRecognition());
    expect(Array.isArray(result.current.faces)).toBe(true);
  });
});
