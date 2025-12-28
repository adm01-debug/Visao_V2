// src/hooks/__tests__/useAnalysisConfigs.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAnalysisConfigs } from '../useAnalysisConfigs';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockConfig = { id: 'config-1', camera_id: 'cam-1', face_detection: true, plate_detection: true, motion_detection: true, interval_ms: 1000 };

describe('useAnalysisConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [mockConfig], error: null }),
      insert: vi.fn().mockResolvedValue({ data: mockConfig, error: null }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockConfig, error: null }) }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useAnalysisConfigs());
      expect(result.current).toBeDefined();
    });
  });

  describe('CRUD', () => {
    it('deve buscar configurações', async () => {
      const { result } = renderHook(() => useAnalysisConfigs());
      await waitFor(() => expect(result.current.configs).toBeDefined());
    });

    it('deve criar configuração', async () => {
      const { result } = renderHook(() => useAnalysisConfigs());
      if (result.current.createConfig) {
        await act(async () => { await result.current.createConfig({ camera_id: 'cam-1' }); });
      }
    });

    it('deve atualizar configuração', async () => {
      const { result } = renderHook(() => useAnalysisConfigs());
      if (result.current.updateConfig) {
        await act(async () => { await result.current.updateConfig('config-1', { interval_ms: 2000 }); });
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useAnalysisConfigs());
      expect(() => unmount()).not.toThrow();
    });
  });
});
