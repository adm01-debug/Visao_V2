import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePictureInPicture } from '@/hooks/usePictureInPicture';

describe('usePictureInPicture', () => {
  it('deve verificar suporte', () => {
    const { result } = renderHook(() => usePictureInPicture());
    expect(result.current.isSupported).toBeDefined();
  });

  it('deve entrar em PiP', async () => {
    const mockVideo = { requestPictureInPicture: vi.fn().mockResolvedValue({}) };
    const { result } = renderHook(() => usePictureInPicture());
    await act(async () => { await result.current.enter(mockVideo as any); });
  });

  it('deve sair de PiP', async () => {
    document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePictureInPicture());
    await act(async () => { await result.current.exit(); });
  });
});
