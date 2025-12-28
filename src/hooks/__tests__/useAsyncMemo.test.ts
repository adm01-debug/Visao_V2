import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAsyncMemo } from '@/hooks/useAsyncMemo';

describe('useAsyncMemo', () => {
  it('computes async value', async () => {
    const compute = vi.fn().mockResolvedValue('computed');
    const { result } = renderHook(() => useAsyncMemo(compute, []));
    await waitFor(() => expect(result.current.value).toBe('computed'));
  });

  it('tracks loading state', async () => {
    const compute = vi.fn().mockImplementation(() => new Promise(r => setTimeout(() => r('done'), 50)));
    const { result } = renderHook(() => useAsyncMemo(compute, []));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('memoizes result', async () => {
    const compute = vi.fn().mockResolvedValue('value');
    const { rerender } = renderHook(() => useAsyncMemo(compute, []));
    await waitFor(() => expect(compute).toHaveBeenCalledTimes(1));
    rerender();
    expect(compute).toHaveBeenCalledTimes(1);
  });
});
