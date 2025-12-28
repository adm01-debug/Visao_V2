import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAsyncEffect } from '@/hooks/useAsyncEffect';

describe('useAsyncEffect', () => {
  it('runs async effect', async () => {
    const effect = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAsyncEffect(effect, []));
    await waitFor(() => expect(effect).toHaveBeenCalled());
  });

  it('runs cleanup function', () => {
    const cleanup = vi.fn();
    const effect = vi.fn().mockResolvedValue(cleanup);
    const { unmount } = renderHook(() => useAsyncEffect(effect, []));
    unmount();
    expect(cleanup).toHaveBeenCalled();
  });

  it('re-runs on dependency change', async () => {
    const effect = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(({ dep }) => useAsyncEffect(effect, [dep]), { initialProps: { dep: 1 } });
    rerender({ dep: 2 });
    await waitFor(() => expect(effect).toHaveBeenCalledTimes(2));
  });
});
