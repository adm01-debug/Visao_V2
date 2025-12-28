import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useUnmount } from '@/hooks/useUnmount';

describe('useUnmount', () => {
  it('deve executar callback ao desmontar', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useUnmount(callback));
    unmount();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('não deve executar antes de desmontar', () => {
    const callback = vi.fn();
    renderHook(() => useUnmount(callback));
    expect(callback).not.toHaveBeenCalled();
  });
});
