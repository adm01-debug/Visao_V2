import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useMount } from '@/hooks/useMount';

describe('useMount', () => {
  it('deve executar callback na montagem', () => {
    const callback = vi.fn();
    renderHook(() => useMount(callback));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('não deve executar callback no re-render', () => {
    const callback = vi.fn();
    const { rerender } = renderHook(() => useMount(callback));
    rerender();
    rerender();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
