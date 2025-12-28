import { describe, it, expect, beforeEach } from 'vitest';
import { usePlaybackStore } from '@/stores/playbackStore';
import { act, renderHook } from '@testing-library/react';

describe('playbackStore', () => {
  beforeEach(() => { usePlaybackStore.getState().reset(); });

  it('deve iniciar playback', () => {
    const { result } = renderHook(() => usePlaybackStore());
    act(() => { result.current.play(); });
    expect(result.current.isPlaying).toBe(true);
  });

  it('deve pausar playback', () => {
    const { result } = renderHook(() => usePlaybackStore());
    act(() => { result.current.play(); });
    act(() => { result.current.pause(); });
    expect(result.current.isPlaying).toBe(false);
  });

  it('deve definir posição', () => {
    const { result } = renderHook(() => usePlaybackStore());
    act(() => { result.current.seek(30); });
    expect(result.current.currentTime).toBe(30);
  });
});
