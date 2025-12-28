import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchStore } from '@/stores/searchStore';
import { act, renderHook } from '@testing-library/react';

describe('searchStore', () => {
  beforeEach(() => { useSearchStore.getState().reset(); });

  it('deve definir query', () => {
    const { result } = renderHook(() => useSearchStore());
    act(() => { result.current.setQuery('test'); });
    expect(result.current.query).toBe('test');
  });

  it('deve limpar busca', () => {
    const { result } = renderHook(() => useSearchStore());
    act(() => { result.current.setQuery('test'); });
    act(() => { result.current.clear(); });
    expect(result.current.query).toBe('');
  });
});
