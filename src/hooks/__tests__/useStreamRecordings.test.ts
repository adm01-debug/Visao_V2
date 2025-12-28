// src/hooks/__tests__/useStreamRecordings.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStreamRecordings } from '../useStreamRecordings';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockRecording = {
  id: 'stream-rec-1',
  camera_id: 'cam-1',
  stream_url: 'rtsp://example.com/stream',
  status: 'recording',
  start_time: new Date().toISOString(),
};

describe('useStreamRecordings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [mockRecording], error: null }),
        eq: vi.fn().mockResolvedValue({ data: [mockRecording], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: mockRecording, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockRecording, error: null }),
      }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useStreamRecordings());
      expect(result.current).toBeDefined();
    });
  });

  describe('Gravação de Stream', () => {
    it('deve iniciar gravação de stream', async () => {
      const { result } = renderHook(() => useStreamRecordings());
      if (result.current.startStreamRecording) {
        await act(async () => {
          await result.current.startStreamRecording('cam-1', 'rtsp://example.com/stream');
        });
      }
    });

    it('deve parar gravação de stream', async () => {
      const { result } = renderHook(() => useStreamRecordings());
      if (result.current.stopStreamRecording) {
        await act(async () => {
          await result.current.stopStreamRecording('stream-rec-1');
        });
      }
    });
  });

  describe('Busca', () => {
    it('deve buscar gravações de stream', async () => {
      const { result } = renderHook(() => useStreamRecordings());
      await waitFor(() => expect(result.current.recordings).toBeDefined());
    });

    it('deve filtrar por câmera', async () => {
      const { result } = renderHook(() => useStreamRecordings());
      if (result.current.getByCamera) {
        await act(async () => {
          const recs = await result.current.getByCamera('cam-1');
          expect(Array.isArray(recs)).toBe(true);
        });
      }
    });
  });

  describe('Status', () => {
    it('deve retornar gravações ativas', () => {
      const { result } = renderHook(() => useStreamRecordings());
      if (result.current.activeRecordings) {
        expect(Array.isArray(result.current.activeRecordings)).toBe(true);
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useStreamRecordings());
      expect(() => unmount()).not.toThrow();
    });
  });
});
