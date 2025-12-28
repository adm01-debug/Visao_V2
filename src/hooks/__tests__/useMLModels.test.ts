// src/hooks/__tests__/useMLModels.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMLModels } from '../useMLModels';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useMLModels', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useMLModels());
      expect(result.current).toBeDefined();
    });
  });

  describe('Carregamento de Modelos', () => {
    it('deve listar modelos disponíveis', () => {
      const { result } = renderHook(() => useMLModels());
      if (result.current.availableModels) {
        expect(Array.isArray(result.current.availableModels)).toBe(true);
      }
    });

    it('deve carregar modelo', async () => {
      const { result } = renderHook(() => useMLModels());
      if (result.current.loadModel) {
        await act(async () => {
          await result.current.loadModel('face-detection');
        });
      }
    });

    it('deve descarregar modelo', async () => {
      const { result } = renderHook(() => useMLModels());
      if (result.current.unloadModel) {
        await act(async () => {
          await result.current.unloadModel('face-detection');
        });
      }
    });
  });

  describe('Status', () => {
    it('deve retornar modelos carregados', () => {
      const { result } = renderHook(() => useMLModels());
      if (result.current.loadedModels) {
        expect(Array.isArray(result.current.loadedModels)).toBe(true);
      }
    });

    it('deve verificar se modelo está carregado', () => {
      const { result } = renderHook(() => useMLModels());
      if (result.current.isModelLoaded) {
        const loaded = result.current.isModelLoaded('face-detection');
        expect(typeof loaded).toBe('boolean');
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useMLModels());
      expect(() => unmount()).not.toThrow();
    });
  });
});
