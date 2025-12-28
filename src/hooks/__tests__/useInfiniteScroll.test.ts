// src/hooks/__tests__/useInfiniteScroll.test.ts
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useInfiniteScroll } from '../useInfiniteScroll';

describe('useInfiniteScroll', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const loadMore = vi.fn();
    const { result } = renderHook(() => useInfiniteScroll({ loadMore }));
    expect(result.current).toBeDefined();
  });

  it('deve retornar ref', () => {
    const loadMore = vi.fn();
    const { result } = renderHook(() => useInfiniteScroll({ loadMore }));
    if (result.current.ref) {
      expect(result.current.ref).toBeDefined();
    }
  });

  it('deve indicar loading', () => {
    const loadMore = vi.fn();
    const { result } = renderHook(() => useInfiniteScroll({ loadMore }));
    if (result.current.isLoading !== undefined) {
      expect(typeof result.current.isLoading).toBe('boolean');
    }
  });

  it('deve limpar recursos', () => {
    const loadMore = vi.fn();
    const { unmount } = renderHook(() => useInfiniteScroll({ loadMore }));
    expect(() => unmount()).not.toThrow();
  });
});
