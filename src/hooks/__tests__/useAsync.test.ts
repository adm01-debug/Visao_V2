import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAsync } from '@/hooks/useAsync';

describe('useAsync', () => {
  it('executes async function', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useAsync(asyncFn));
    await waitFor(() => expect(result.current.data).toBe('result'));
  });

  it('tracks loading state', async () => {
    const asyncFn = vi.fn().mockImplementation(() => new Promise(r => setTimeout(() => r('done'), 100)));
    const { result } = renderHook(() => useAsync(asyncFn));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('handles errors', async () => {
    const asyncFn = vi.fn().mockRejectedValue(new Error('Failed'));
    const { result } = renderHook(() => useAsync(asyncFn));
    await waitFor(() => expect(result.current.error?.message).toBe('Failed'));
  });

  it('can be re-executed', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useAsync(asyncFn, { immediate: false }));
    act(() => { result.current.execute(); });
    await waitFor(() => expect(asyncFn).toHaveBeenCalled());
  });
});
