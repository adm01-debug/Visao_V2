import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '@/stores/filterStore';
import { act, renderHook } from '@testing-library/react';

describe('filterStore', () => {
  beforeEach(() => { useFilterStore.getState().reset(); });

  it('deve definir filtro', () => {
    const { result } = renderHook(() => useFilterStore());
    act(() => { result.current.setFilter('camera', 'cam1'); });
    expect(result.current.filters.camera).toBe('cam1');
  });

  it('deve limpar filtros', () => {
    const { result } = renderHook(() => useFilterStore());
    act(() => { result.current.setFilter('camera', 'cam1'); });
    act(() => { result.current.clearFilters(); });
    expect(result.current.filters.camera).toBeUndefined();
  });
});
