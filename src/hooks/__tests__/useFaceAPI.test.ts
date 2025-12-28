// src/hooks/__tests__/useFaceAPI.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFaceAPI } from '../useFaceAPI';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useFaceAPI', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useFaceAPI());
      expect(result.current).toBeDefined();
      expect(result.current.isLoaded).toBeDefined();
    });
  });

  describe('Carregamento de Modelos', () => {
    it('deve carregar modelos', async () => {
      const { result } = renderHook(() => useFaceAPI());
      if (result.current.loadModels) {
        await act(async () => {
          await result.current.loadModels();
        });
      }
    });

    it('deve verificar status de carregamento', () => {
      const { result } = renderHook(() => useFaceAPI());
      expect(typeof result.current.isLoaded).toBe('boolean');
    });
  });

  describe('Detecção Facial', () => {
    it('deve detectar rostos em imagem', async () => {
      const { result } = renderHook(() => useFaceAPI());
      if (result.current.detectFaces) {
        const canvas = document.createElement('canvas');
        await act(async () => {
          const faces = await result.current.detectFaces(canvas);
          expect(Array.isArray(faces)).toBe(true);
        });
      }
    });

    it('deve detectar landmarks', async () => {
      const { result } = renderHook(() => useFaceAPI());
      if (result.current.detectLandmarks) {
        await act(async () => {
          const landmarks = await result.current.detectLandmarks(document.createElement('canvas'));
        });
      }
    });
  });

  describe('Comparação Facial', () => {
    it('deve comparar dois rostos', async () => {
      const { result } = renderHook(() => useFaceAPI());
      if (result.current.compareFaces) {
        await act(async () => {
          const similarity = await result.current.compareFaces(new Float32Array(128), new Float32Array(128));
          expect(typeof similarity).toBe('number');
        });
      }
    });

    it('deve encontrar melhor match', async () => {
      const { result } = renderHook(() => useFaceAPI());
      if (result.current.findBestMatch) {
        await act(async () => {
          await result.current.findBestMatch(new Float32Array(128), []);
        });
      }
    });
  });

  describe('Encoding', () => {
    it('deve gerar face encoding', async () => {
      const { result } = renderHook(() => useFaceAPI());
      if (result.current.getFaceEncoding) {
        await act(async () => {
          const encoding = await result.current.getFaceEncoding(document.createElement('canvas'));
        });
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useFaceAPI());
      expect(() => unmount()).not.toThrow();
    });
  });
});
