import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAsyncCallback } from '@/hooks/useAsyncCallback';

describe('useAsyncCallback', () => {
  it('returns callback function', () => {
    const { result } = renderHook(() => useAsyncCallback(async () => {}));
    expect(typeof result.current[0]).toBe('function');
  });

  it('executes async callback', async () => {
    const asyncFn = vi.fn().mockResolvedValue('done');
    const { result } = renderHook(() => useAsyncCallback(asyncFn));
    await act(async () => { await result.current[0](); });
    expect(asyncFn).toHaveBeenCalled();
  });

  it('tracks loading state', async () => {
    const asyncFn = vi.fn().mockImplementation(() => new Promise(r => setTimeout(r, 50)));
    const { result } = renderHook(() => useAsyncCallback(asyncFn));
    act(() => { result.current[0](); });
    expect(result.current[1].loading).toBe(true);
  });

  it('returns result', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useAsyncCallback(asyncFn));
    let returnValue;
    await act(async () => { returnValue = await result.current[0](); });
    expect(returnValue).toBe('result');
  });
});
