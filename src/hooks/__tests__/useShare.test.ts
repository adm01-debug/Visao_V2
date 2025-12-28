import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useShare } from '@/hooks/useShare';

describe('useShare', () => {
  it('deve verificar suporte', () => {
    const { result } = renderHook(() => useShare());
    expect(result.current.isSupported).toBeDefined();
  });

  it('deve compartilhar', async () => {
    navigator.share = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useShare());
    await act(async () => { await result.current.share({ title: 'Test' }); });
    expect(navigator.share).toHaveBeenCalled();
  });
});
