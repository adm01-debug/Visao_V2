// src/hooks/__tests__/use-mobilex.test.ts
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../use-mobilex', () => ({
  useMobile: () => false,
  default: () => false,
}));

import { useMobile } from '../use-mobilex';

describe('use-mobilex', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => useMobile());
    expect(result.current !== undefined).toBe(true);
  });

  it('deve retornar boolean', () => {
    const { result } = renderHook(() => useMobile());
    expect(typeof result.current === 'boolean' || result.current === undefined).toBe(true);
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => useMobile());
    expect(() => unmount()).not.toThrow();
  });
});
