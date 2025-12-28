import { describe, it, expect, beforeEach } from 'vitest';
import { useMediaStore } from '@/stores/mediaStore';
import { act, renderHook } from '@testing-library/react';

describe('mediaStore', () => {
  beforeEach(() => { useMediaStore.getState().reset(); });

  it('deve adicionar mídia', () => {
    const { result } = renderHook(() => useMediaStore());
    act(() => { result.current.addMedia({ id: '1', type: 'video', url: '/video.mp4' }); });
    expect(result.current.media).toHaveLength(1);
  });

  it('deve remover mídia', () => {
    const { result } = renderHook(() => useMediaStore());
    act(() => { result.current.addMedia({ id: '1', type: 'video' }); });
    act(() => { result.current.removeMedia('1'); });
    expect(result.current.media).toHaveLength(0);
  });
});
