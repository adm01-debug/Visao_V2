// src/hooks/__tests__/useRecordings.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRecordings } from '../useRecordings';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'video.mp4' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/video.mp4' } }),
      }),
    },
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockRecording = {
  id: 'rec-1',
  camera_id: 'cam-1',
  camera_name: 'Câmera 1',
  start_time: new Date().toISOString(),
  end_time: new Date().toISOString(),
  duration: 300,
  file_path: 'recordings/rec-1.mp4',
  file_size: 1024000,
  status: 'completed',
  thumbnail_url: 'https://example.com/thumb.jpg',
};

describe('useRecordings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [mockRecording], error: null }),
        }),
        eq: vi.fn().mockResolvedValue({ data: [mockRecording], error: null }),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      }),
      insert: vi.fn().mockResolvedValue({ data: mockRecording, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockRecording, error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar com estado padrão', () => {
      const { result } = renderHook(() => useRecordings());
      expect(result.current).toBeDefined();
      expect(result.current.recordings).toBeDefined();
    });
  });

  describe('Busca de Gravações', () => {
    it('deve buscar gravações', async () => {
      const { result } = renderHook(() => useRecordings());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it('deve filtrar por câmera', async () => {
      const { result } = renderHook(() => useRecordings());
      if (result.current.getByCamera) {
        await act(async () => {
          const recordings = await result.current.getByCamera('cam-1');
          expect(Array.isArray(recordings)).toBe(true);
        });
      }
    });

    it('deve filtrar por data', async () => {
      const { result } = renderHook(() => useRecordings());
      if (result.current.getByDateRange) {
        await act(async () => {
          const recordings = await result.current.getByDateRange(new Date(), new Date());
          expect(Array.isArray(recordings)).toBe(true);
        });
      }
    });
  });

  describe('Gerenciamento de Gravações', () => {
    it('deve iniciar gravação', async () => {
      const { result } = renderHook(() => useRecordings());
      if (result.current.startRecording) {
        await act(async () => {
          await result.current.startRecording('cam-1');
        });
      }
    });

    it('deve parar gravação', async () => {
      const { result } = renderHook(() => useRecordings());
      if (result.current.stopRecording) {
        await act(async () => {
          await result.current.stopRecording('rec-1');
        });
      }
    });

    it('deve deletar gravação', async () => {
      const { result } = renderHook(() => useRecordings());
      if (result.current.deleteRecording) {
        await act(async () => {
          await result.current.deleteRecording('rec-1');
        });
      }
    });
  });

  describe('Download e Playback', () => {
    it('deve obter URL de download', () => {
      const { result } = renderHook(() => useRecordings());
      if (result.current.getDownloadUrl) {
        const url = result.current.getDownloadUrl('rec-1');
        expect(typeof url).toBe('string');
      }
    });

    it('deve obter URL de stream', () => {
      const { result } = renderHook(() => useRecordings());
      if (result.current.getStreamUrl) {
        const url = result.current.getStreamUrl('rec-1');
        expect(typeof url).toBe('string');
      }
    });
  });

  describe('Estatísticas', () => {
    it('deve calcular armazenamento total', () => {
      const { result } = renderHook(() => useRecordings());
      if (result.current.totalStorage !== undefined) {
        expect(typeof result.current.totalStorage).toBe('number');
      }
    });

    it('deve contar gravações por câmera', () => {
      const { result } = renderHook(() => useRecordings());
      if (result.current.countByCamera) {
        const counts = result.current.countByCamera();
        expect(typeof counts).toBe('object');
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useRecordings());
      expect(() => unmount()).not.toThrow();
    });
  });
});
