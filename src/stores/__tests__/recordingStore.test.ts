import { describe, it, expect, beforeEach } from 'vitest';
import { useRecordingStore } from '@/stores/recordingStore';
import { act, renderHook } from '@testing-library/react';

describe('recordingStore', () => {
  beforeEach(() => { useRecordingStore.getState().reset(); });

  it('deve iniciar gravação', () => {
    const { result } = renderHook(() => useRecordingStore());
    act(() => { result.current.startRecording('cam1'); });
    expect(result.current.isRecording).toBe(true);
  });

  it('deve parar gravação', () => {
    const { result } = renderHook(() => useRecordingStore());
    act(() => { result.current.startRecording('cam1'); });
    act(() => { result.current.stopRecording(); });
    expect(result.current.isRecording).toBe(false);
  });
});
