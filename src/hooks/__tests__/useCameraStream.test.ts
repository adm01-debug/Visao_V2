import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCameraStream } from '@/hooks/useCameraStream';

describe('useCameraStream', () => {
  beforeEach(() => {
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
    } as any;
  });

  it('starts stream', async () => {
    const { result } = renderHook(() => useCameraStream());
    await waitFor(() => expect(result.current.stream).toBeDefined());
  });

  it('provides stop function', () => {
    const { result } = renderHook(() => useCameraStream());
    expect(typeof result.current.stop).toBe('function');
  });

  it('handles error', async () => {
    global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('Denied'));
    const { result } = renderHook(() => useCameraStream());
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('cleans up on unmount', () => {
    const stop = vi.fn();
    global.navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
    const { unmount } = renderHook(() => useCameraStream());
    unmount();
    expect(stop).toHaveBeenCalled();
  });
});
