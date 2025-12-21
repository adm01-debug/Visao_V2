/**
 * VISÃO - Testes: useFaceAPI
 * 
 * Testes unitários para o hook de detecção facial.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFaceAPI } from '../useFaceAPI';

// Mocks
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
      withFaceDescriptors: vi.fn().mockResolvedValue([]),
    }),
  }),
  TinyFaceDetectorOptions: vi.fn(),
  SsdMobilenetv1Options: vi.fn(),
  draw: {
    DrawBox: vi.fn(),
    DrawFaceLandmarks: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://test.jpg' } }),
      }),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useFaceAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Inicialização', () => {
    it('deve inicializar com modelos não carregados', () => {
      const { result } = renderHook(() => useFaceAPI());
      
      expect(result.current.modelsLoaded).toBe(false);
      expect(result.current.isDetecting).toBe(false);
    });

    it('deve ter configuração padrão correta', () => {
      const { result } = renderHook(() => useFaceAPI());
      
      expect(result.current.config).toBeDefined();
      expect(result.current.config.modelPath).toContain('jsdelivr');
      expect(result.current.config.minConfidence).toBeGreaterThan(0);
    });
  });

  describe('Carregamento de modelos', () => {
    it('deve expor função loadModels', () => {
      const { result } = renderHook(() => useFaceAPI());
      
      expect(typeof result.current.loadModels).toBe('function');
    });

    it('deve permitir atualização de config', () => {
      const { result } = renderHook(() => useFaceAPI());
      
      act(() => {
        result.current.updateConfig({ minConfidence: 0.8 });
      });
      
      expect(result.current.config.minConfidence).toBe(0.8);
    });
  });

  describe('Detecção', () => {
    it('deve expor função detectFaces', () => {
      const { result } = renderHook(() => useFaceAPI());
      
      expect(typeof result.current.detectFaces).toBe('function');
    });

    it('deve expor função detectSingleFace', () => {
      const { result } = renderHook(() => useFaceAPI());
      
      expect(typeof result.current.detectSingleFace).toBe('function');
    });
  });

  describe('Matching', () => {
    it('deve expor função matchFace', () => {
      const { result } = renderHook(() => useFaceAPI());
      
      expect(typeof result.current.matchFace).toBe('function');
    });

    it('deve retornar null quando não há faces registradas', () => {
      const { result } = renderHook(() => useFaceAPI());
      
      const mockDescriptor = new Float32Array(128).fill(0);
      const match = result.current.matchFace(mockDescriptor);
      
      expect(match).toBeNull();
    });
  });

  describe('Registro', () => {
    it('deve expor função registerFace', () => {
      const { result } = renderHook(() => useFaceAPI());
      
      expect(typeof result.current.registerFace).toBe('function');
    });

    it('deve expor função loadRegisteredFaces', () => {
      const { result } = renderHook(() => useFaceAPI());
      
      expect(typeof result.current.loadRegisteredFaces).toBe('function');
    });
  });

  describe('Desenho', () => {
    it('deve expor função drawDetections', () => {
      const { result } = renderHook(() => useFaceAPI());
      
      expect(typeof result.current.drawDetections).toBe('function');
    });
  });

  describe('Erro handling', () => {
    it('deve permitir callback de erro customizado', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useFaceAPI({ onError }));
      
      expect(result.current).toBeDefined();
    });
  });
});
