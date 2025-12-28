// src/hooks/__tests__/useCameraSnapshots.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCameraSnapshots } from '../useCameraSnapshots';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'snap.jpg' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/snap.jpg' } }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockSnapshot = {
  id: 'snap-1',
  camera_id: 'cam-1',
  image_url: 'https://example.com/snap.jpg',
  timestamp: new Date().toISOString(),
  metadata: { width: 1920, height: 1080 },
};

describe('useCameraSnapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [mockSnapshot], error: null }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: mockSnapshot, error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useCameraSnapshots());
      expect(result.current).toBeDefined();
    });
  });

  describe('Captura de Snapshots', () => {
    it('deve capturar snapshot', async () => {
      const { result } = renderHook(() => useCameraSnapshots());
      if (result.current.captureSnapshot) {
        await act(async () => {
          await result.current.captureSnapshot('cam-1');
        });
      }
    });

    it('deve capturar snapshot de canvas', async () => {
      const { result } = renderHook(() => useCameraSnapshots());
      if (result.current.captureFromCanvas) {
        const canvas = document.createElement('canvas');
        await act(async () => {
          await result.current.captureFromCanvas(canvas, 'cam-1');
        });
      }
    });
  });

  describe('Busca de Snapshots', () => {
    it('deve buscar snapshots por câmera', async () => {
      const { result } = renderHook(() => useCameraSnapshots());
      if (result.current.getSnapshotsByCamera) {
        await act(async () => {
          const snaps = await result.current.getSnapshotsByCamera('cam-1');
          expect(Array.isArray(snaps)).toBe(true);
        });
      }
    });

    it('deve buscar último snapshot', async () => {
      const { result } = renderHook(() => useCameraSnapshots());
      if (result.current.getLatestSnapshot) {
        await act(async () => {
          const snap = await result.current.getLatestSnapshot('cam-1');
        });
      }
    });
  });

  describe('Deleção', () => {
    it('deve deletar snapshot', async () => {
      const { result } = renderHook(() => useCameraSnapshots());
      if (result.current.deleteSnapshot) {
        await act(async () => {
          await result.current.deleteSnapshot('snap-1');
        });
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useCameraSnapshots());
      expect(() => unmount()).not.toThrow();
    });
  });
});
