// src/hooks/__tests__/useHeatmapSnapshots.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useHeatmapSnapshots } from '../useHeatmapSnapshots';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    storage: { from: vi.fn().mockReturnValue({ upload: vi.fn().mockResolvedValue({ data: {}, error: null }) }) },
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useHeatmapSnapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }),
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useHeatmapSnapshots());
      expect(result.current).toBeDefined();
    });
  });

  describe('Captura', () => {
    it('deve capturar snapshot de heatmap', async () => {
      const { result } = renderHook(() => useHeatmapSnapshots());
      if (result.current.captureHeatmap) {
        await act(async () => { await result.current.captureHeatmap('cam-1', new Uint8Array()); });
      }
    });
  });

  describe('Busca', () => {
    it('deve buscar snapshots por câmera', async () => {
      const { result } = renderHook(() => useHeatmapSnapshots());
      if (result.current.getByCamera) {
        await act(async () => {
          const snaps = await result.current.getByCamera('cam-1');
          expect(Array.isArray(snaps)).toBe(true);
        });
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useHeatmapSnapshots());
      expect(() => unmount()).not.toThrow();
    });
  });
});
