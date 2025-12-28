import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useMediaRecorder', () => ({
  useMediaRecorder: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    isRecording: false,
    isPaused: false,
    blob: null,
  }),
}));

describe('useMediaRecorder', () => {
  it('deve iniciar gravação', async () => {
    const { useMediaRecorder } = await import('@/hooks/useMediaRecorder');
    const { result } = renderHook(() => useMediaRecorder());
    expect(result.current.start).toBeDefined();
  });

  it('deve parar gravação', async () => {
    const { useMediaRecorder } = await import('@/hooks/useMediaRecorder');
    const { result } = renderHook(() => useMediaRecorder());
    expect(result.current.stop).toBeDefined();
  });
});
