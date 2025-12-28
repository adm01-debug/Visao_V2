import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useRetry } from '@/hooks/useRetry';

describe('useRetry', () => {
  it('deve tentar novamente em caso de falha', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error()).mockResolvedValue('ok');
    const { result } = renderHook(() => useRetry(fn, { maxRetries: 3 }));
    await act(async () => { await result.current.execute(); });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('deve parar após max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error());
    const { result } = renderHook(() => useRetry(fn, { maxRetries: 2 }));
    await act(async () => { try { await result.current.execute(); } catch {} });
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
