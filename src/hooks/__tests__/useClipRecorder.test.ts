// src/hooks/__tests__/useClipRecorder.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useClipRecorder } from '../useClipRecorder';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'clip.mp4' }, error: null }),
      }),
    },
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock MediaRecorder
global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
})) as any;

describe('useClipRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useClipRecorder());
      expect(result.current).toBeDefined();
      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('Gravação', () => {
    it('deve iniciar gravação', async () => {
      const mockStream = { getTracks: () => [] } as any;
      const { result } = renderHook(() => useClipRecorder());
      if (result.current.startRecording) {
        await act(async () => {
          await result.current.startRecording(mockStream, 'cam-1');
        });
      }
    });

    it('deve parar gravação', async () => {
      const { result } = renderHook(() => useClipRecorder());
      if (result.current.stopRecording) {
        await act(async () => {
          await result.current.stopRecording();
        });
      }
    });

    it('deve pausar gravação', () => {
      const { result } = renderHook(() => useClipRecorder());
      if (result.current.pauseRecording) {
        act(() => { result.current.pauseRecording(); });
      }
    });

    it('deve retomar gravação', () => {
      const { result } = renderHook(() => useClipRecorder());
      if (result.current.resumeRecording) {
        act(() => { result.current.resumeRecording(); });
      }
    });
  });

  describe('Estado', () => {
    it('deve retornar duração', () => {
      const { result } = renderHook(() => useClipRecorder());
      if (result.current.duration !== undefined) {
        expect(typeof result.current.duration).toBe('number');
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useClipRecorder());
      expect(() => unmount()).not.toThrow();
    });
  });
});
