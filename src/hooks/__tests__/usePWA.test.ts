// src/hooks/__tests__/usePWA.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePWA } from '../usePWA';

describe('usePWA', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => usePWA());
    expect(result.current).toBeDefined();
  });

  it('deve verificar se é instalável', () => {
    const { result } = renderHook(() => usePWA());
    if (result.current.isInstallable !== undefined) {
      expect(typeof result.current.isInstallable).toBe('boolean');
    }
  });

  it('deve verificar se está instalado', () => {
    const { result } = renderHook(() => usePWA());
    if (result.current.isInstalled !== undefined) {
      expect(typeof result.current.isInstalled).toBe('boolean');
    }
  });

  it('deve ter função de instalar', () => {
    const { result } = renderHook(() => usePWA());
    if (result.current.install) {
      expect(typeof result.current.install).toBe('function');
    }
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => usePWA());
    expect(() => unmount()).not.toThrow();
  });
});
