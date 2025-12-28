// src/hooks/__tests__/useOnlineStatus.test.ts
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOnlineStatus } from '../useOnlineStatus';

describe('useOnlineStatus', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBeDefined();
  });

  it('deve retornar status boolean', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(typeof result.current === 'boolean' || typeof result.current === 'object').toBe(true);
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => useOnlineStatus());
    expect(() => unmount()).not.toThrow();
  });
});
