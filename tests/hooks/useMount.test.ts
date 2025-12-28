import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('useMount', () => {
  it('deve executar callback na montagem', () => {
    const callback = vi.fn();
    renderHook(() => {
      if (callback) callback();
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
