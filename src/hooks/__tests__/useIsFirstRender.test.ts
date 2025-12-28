import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useIsFirstRender } from '@/hooks/useIsFirstRender';

describe('useIsFirstRender', () => {
  it('deve retornar true na primeira renderização', () => {
    const { result } = renderHook(() => useIsFirstRender());
    expect(result.current).toBe(true);
  });

  it('deve retornar false após re-render', () => {
    const { result, rerender } = renderHook(() => useIsFirstRender());
    rerender();
    expect(result.current).toBe(false);
  });

  it('deve manter false em renderizações subsequentes', () => {
    const { result, rerender } = renderHook(() => useIsFirstRender());
    rerender();
    rerender();
    rerender();
    expect(result.current).toBe(false);
  });
});
