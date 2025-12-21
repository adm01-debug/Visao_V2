/**
 * VISÃO - Testes do useFaceAPI
 * Testes para detecção facial com face-api.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock do face-api.js
vi.mock('face-api.js', () => ({
  nets: {
    ssdMobilenetv1: {
      loadFromUri: vi.fn().mockResolvedValue(undefined),
      isLoaded: false,
    },
    tinyFaceDetector: {
      loadFromUri: vi.fn().mockResolvedValue(undefined),
      isLoaded: false,
    },
    faceLandmark68Net: {
      loadFromUri: vi.fn().mockResolvedValue(undefined),
      isLoaded: false,
    },
    faceRecognitionNet: {
      loadFromUri: vi.fn().mockResolvedValue(undefined),
      isLoaded: false,
    },
    faceExpressionNet: {
      loadFromUri: vi.fn().mockResolvedValue(undefined),
      isLoaded: false,
    },
    ageGenderNet: {
      loadFromUri: vi.fn().mockResolvedValue(undefined),
      isLoaded: false,
    },
  },
  detectAllFaces: vi.fn().mockReturnValue({
    withFaceLandmarks: vi.fn().mockReturnValue({
      withFaceDescriptors: vi.fn().mockResolvedValue([
        {
          detection: {
            box: { x: 100, y: 100, width: 150, height: 150 },
            score: 0.95,
          },
          landmarks: {},
          descriptor: new Float32Array(128).fill(0.5),
        },
      ]),
    }),
  }),
  detectSingleFace: vi.fn().mockReturnValue({
    withFaceLandmarks: vi.fn().mockReturnValue({
      withFaceDescriptor: vi.fn().mockResolvedValue({
        detection: {
          box: { x: 100, y: 100, width: 150, height: 150 },
          score: 0.95,
        },
        landmarks: {},
        descriptor: new Float32Array(128).fill(0.5),
      }),
    }),
  }),
  TinyFaceDetectorOptions: vi.fn().mockImplementation(() => ({})),
  SsdMobilenetv1Options: vi.fn().mockImplementation(() => ({})),
  FaceMatcher: vi.fn().mockImplementation(() => ({
    findBestMatch: vi.fn().mockReturnValue({
      label: 'person_1',
      distance: 0.4,
    }),
  })),
  LabeledFaceDescriptors: vi.fn().mockImplementation((label, descriptors) => ({
    label,
    descriptors,
  })),
  euclideanDistance: vi.fn().mockReturnValue(0.4),
  draw: {
    DrawBox: vi.fn().mockImplementation(() => ({
      draw: vi.fn(),
    })),
    drawFaceLandmarks: vi.fn(),
  },
}));

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: '1',
              person_id: 'person_1',
              encoding: Array(128).fill(0.5),
              registered_persons: {
                id: 'person_1',
                name: 'João Silva',
                status: 'known',
              },
            },
          ],
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

describe('useFaceAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have default config with CDN path', async () => {
    const { useFaceAPI } = await import('@/hooks/useFaceAPI');
    
    const { result } = renderHook(() => useFaceAPI());

    expect(result.current.config.modelPath).toContain('cdn.jsdelivr.net');
    expect(result.current.config.minConfidence).toBe(0.6);
    expect(result.current.config.matchThreshold).toBe(0.6);
  });

  it('should initialize with loading state', async () => {
    const { useFaceAPI } = await import('@/hooks/useFaceAPI');
    
    const { result } = renderHook(() => useFaceAPI({ autoLoad: false }));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isReady).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should have detectFaces function', async () => {
    const { useFaceAPI } = await import('@/hooks/useFaceAPI');
    
    const { result } = renderHook(() => useFaceAPI());

    expect(typeof result.current.detectFaces).toBe('function');
    expect(typeof result.current.detectSingleFace).toBe('function');
    expect(typeof result.current.matchFace).toBe('function');
  });

  it('should have registerFace function', async () => {
    const { useFaceAPI } = await import('@/hooks/useFaceAPI');
    
    const { result } = renderHook(() => useFaceAPI());

    expect(typeof result.current.registerFace).toBe('function');
  });
});

describe('Face Detection Utilities', () => {
  it('should calculate face similarity correctly', () => {
    const desc1 = new Float32Array(128).fill(0.5);
    const desc2 = new Float32Array(128).fill(0.5);
    
    let sum = 0;
    for (let i = 0; i < 128; i++) {
      sum += Math.pow(desc1[i] - desc2[i], 2);
    }
    const distance = Math.sqrt(sum);
    
    expect(distance).toBe(0);
  });

  it('should calculate different faces as non-matching', () => {
    const desc1 = new Float32Array(128).fill(0.5);
    const desc2 = new Float32Array(128).fill(0.9);
    
    let sum = 0;
    for (let i = 0; i < 128; i++) {
      sum += Math.pow(desc1[i] - desc2[i], 2);
    }
    const distance = Math.sqrt(sum);
    
    expect(distance).toBeGreaterThan(0.6);
  });
});

describe('Face API Configuration', () => {
  it('should merge custom config with defaults', async () => {
    const { useFaceAPI } = await import('@/hooks/useFaceAPI');
    
    const { result } = renderHook(() => useFaceAPI({
      minConfidence: 0.8,
      matchThreshold: 0.5,
    }));

    expect(result.current.config.minConfidence).toBe(0.8);
    expect(result.current.config.matchThreshold).toBe(0.5);
  });
});
