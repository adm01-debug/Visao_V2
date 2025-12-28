import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDeepMemo } from '@/hooks/useDeepMemo';

describe('useDeepMemo', () => {
  it('memoizes value', () => {
    const factory = vi.fn(() => ({ result: 'value' }));
    const { rerender } = renderHook(({ deps }) => useDeepMemo(factory, deps), { initialProps: { deps: [{ a: 1 }] } });
    rerender({ deps: [{ a: 1 }] });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('recomputes on deep change', () => {
    const factory = vi.fn(() => ({ result: 'value' }));
    const { rerender } = renderHook(({ deps }) => useDeepMemo(factory, deps), { initialProps: { deps: [{ a: 1 }] } });
    rerender({ deps: [{ a: 2 }] });
    expect(factory).toHaveBeenCalledTimes(2);
  });
});
