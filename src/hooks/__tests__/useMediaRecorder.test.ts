import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';

describe('useMediaRecorder', () => {
  beforeEach(() => {
    global.MediaRecorder = vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      state: 'inactive',
      ondataavailable: null,
      onstop: null,
    })) as any;
  });

  it('deve verificar suporte', () => {
    const { result } = renderHook(() => useMediaRecorder());
    expect(result.current.isSupported).toBeDefined();
  });

  it('deve iniciar gravação', async () => {
    const { result } = renderHook(() => useMediaRecorder());
    await act(async () => { await result.current.startRecording(); });
  });

  it('deve parar gravação', async () => {
    const { result } = renderHook(() => useMediaRecorder());
    await act(async () => { await result.current.stopRecording(); });
  });

  it('deve retornar estado da gravação', () => {
    const { result } = renderHook(() => useMediaRecorder());
    expect(result.current.isRecording).toBe(false);
  });
});
