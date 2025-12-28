import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useScreenShare } from '@/hooks/useScreenShare';

describe('useScreenShare', () => {
  it('deve iniciar compartilhamento', async () => {
    navigator.mediaDevices.getDisplayMedia = vi.fn().mockResolvedValue({ getTracks: () => [] });
    const { result } = renderHook(() => useScreenShare());
    await act(async () => { await result.current.startSharing(); });
  });

  it('deve parar compartilhamento', () => {
    const { result } = renderHook(() => useScreenShare());
    act(() => { result.current.stopSharing(); });
    expect(result.current.isSharing).toBe(false);
  });
});
