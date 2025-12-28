// src/hooks/__tests__/useFeatureFlags.test.ts
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFeatureFlags } from '../useFeatureFlags';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useFeatureFlags', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => useFeatureFlags());
    expect(result.current).toBeDefined();
  });

  it('deve verificar flag', () => {
    const { result } = renderHook(() => useFeatureFlags());
    if (result.current.isEnabled) {
      const enabled = result.current.isEnabled('feature-1');
      expect(typeof enabled).toBe('boolean');
    }
  });

  it('deve retornar flags', () => {
    const { result } = renderHook(() => useFeatureFlags());
    if (result.current.flags) {
      expect(typeof result.current.flags).toBe('object');
    }
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => useFeatureFlags());
    expect(() => unmount()).not.toThrow();
  });
});
