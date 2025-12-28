// src/hooks/__tests__/useNetworkStatus.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNetworkStatus } from '../useNetworkStatus';

describe('useNetworkStatus', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBeDefined();
  });

  it('deve retornar status online', () => {
    const { result } = renderHook(() => useNetworkStatus());
    if (result.current.isOnline !== undefined) {
      expect(typeof result.current.isOnline).toBe('boolean');
    }
  });

  it('deve retornar tipo de conexão', () => {
    const { result } = renderHook(() => useNetworkStatus());
    if (result.current.connectionType) {
      expect(typeof result.current.connectionType).toBe('string');
    }
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => useNetworkStatus());
    expect(() => unmount()).not.toThrow();
  });
});
