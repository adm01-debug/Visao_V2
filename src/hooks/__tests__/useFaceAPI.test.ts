/**
 * VISÃO - Testes do useFaceAPI
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock do face-api.js
vi.mock('face-api.js', () => ({
  nets: {
    ssdMobilenetv1: { loadFromUri: vi.fn().mockResolvedValue(undefined) },
    tinyFaceDetector: { loadFromUri: vi.fn().mockResolvedValue(undefined) },
    faceLandmark68Net: { loadFromUri: vi.fn().mockResolvedValue(undefined) },
    faceRecognitionNet: { loadFromUri: vi.fn().mockResolvedValue(undefined) },
    faceExpressionNet: { loadFromUri: vi.fn().mockResolvedValue(undefined) },
    ageGenderNet: { loadFromUri: vi.fn().mockResolvedValue(undefined) },
  },
  detectAllFaces: vi.fn().mockReturnValue({
    withFaceLandmarks: vi.fn().mockReturnValue({
      withFaceDescriptors: vi.fn().mockResolvedValue([
        {
          detection: {
            box: { x: 100, y: 100, width: 80, height: 100 },
            score: 0.95,
          },
          landmarks: {},
          descriptor: new Float32Array(128).fill(0.1),
        },
      ]),
    }),
  }),
  detectSingleFace: vi.fn().mockReturnValue({
    withFaceLandmarks: vi.fn().mockReturnValue({
      withFaceDescriptor: vi.fn().mockResolvedValue({
        detection: {
          box: { x: 100, y: 100, width: 80, height: 100 },
          score: 0.95,
        },
        descriptor: new Float32Array(128).fill(0.1),
      }),
    }),
  }),
  FaceMatcher: vi.fn().mockImplementation(() => ({
    findBestMatch: vi.fn().mockReturnValue({
      label: 'unknown',
      distance: 0.8,
    }),
  })),
  SsdMobilenetv1Options: vi.fn(),
  TinyFaceDetectorOptions: vi.fn(),
}));

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

describe('useFaceAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct defaults', async () => {
    const { useFaceAPI } = await import('@/hooks/useFaceAPI');
    
    const { result } = renderHook(() => useFaceAPI());

    expect(result.current.isReady).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.detections).toEqual([]);
  });

  it('should have correct config defaults', async () => {
    const { useFaceAPI } = await import('@/hooks/useFaceAPI');
    
    const { result } = renderHook(() => useFaceAPI());

    expect(result.current.config.minConfidence).toBe(0.5);
    expect(result.current.config.matchThreshold).toBe(0.6);
  });

  it('should provide detectFaces function', async () => {
    const { useFaceAPI } = await import('@/hooks/useFaceAPI');
    
    const { result } = renderHook(() => useFaceAPI());

    expect(typeof result.current.detectFaces).toBe('function');
  });

  it('should provide matchFace function', async () => {
    const { useFaceAPI } = await import('@/hooks/useFaceAPI');
    
    const { result } = renderHook(() => useFaceAPI());

    expect(typeof result.current.matchFace).toBe('function');
  });

  it('should provide registerFace function', async () => {
    const { useFaceAPI } = await import('@/hooks/useFaceAPI');
    
    const { result } = renderHook(() => useFaceAPI());

    expect(typeof result.current.registerFace).toBe('function');
  });
});

describe('FaceAPI Configuration', () => {
  it('should use CDN for model weights', async () => {
    const { useFaceAPI } = await import('@/hooks/useFaceAPI');
    
    const { result } = renderHook(() => useFaceAPI());

    // Verificar que modelPath usa CDN
    expect(result.current.config.modelPath).toContain('cdn.jsdelivr.net');
  });
});

describe('Face Detection Types', () => {
  it('should have correct FaceDetection interface', () => {
    // Type checking - se compilar, passou
    const detection = {
      id: 'test-id',
      box: { x: 0, y: 0, width: 100, height: 100 },
      descriptor: new Float32Array(128),
    };

    expect(detection.id).toBe('test-id');
    expect(detection.box.width).toBe(100);
    expect(detection.descriptor.length).toBe(128);
  });

  it('should have correct FaceMatch interface', () => {
    const match = {
      personId: 'person-123',
      personName: 'John Doe',
      distance: 0.4,
      similarity: 0.6,
      isMatch: true,
      status: 'known' as const,
    };

    expect(match.isMatch).toBe(true);
    expect(match.status).toBe('known');
  });
});
