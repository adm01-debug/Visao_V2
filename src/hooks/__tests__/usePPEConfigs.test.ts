// src/hooks/__tests__/usePPEConfigs.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePPEConfigs } from '../usePPEConfigs';
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

const mockConfig = { id: 'config-1', camera_id: 'cam-1', helmet_required: true, vest_required: true, glasses_required: false, enabled: true };

describe('usePPEConfigs', () => {
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
      const { result } = renderHook(() => usePPEConfigs());
      expect(result.current).toBeDefined();
    });
  });

  describe('CRUD', () => {
    it('deve buscar configurações', async () => {
      const { result } = renderHook(() => usePPEConfigs());
      await waitFor(() => expect(result.current.configs).toBeDefined());
    });

    it('deve criar configuração', async () => {
      const { result } = renderHook(() => usePPEConfigs());
      if (result.current.createConfig) {
        await act(async () => { await result.current.createConfig({ camera_id: 'cam-1' }); });
      }
    });

    it('deve atualizar configuração', async () => {
      const { result } = renderHook(() => usePPEConfigs());
      if (result.current.updateConfig) {
        await act(async () => { await result.current.updateConfig('config-1', { helmet_required: false }); });
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => usePPEConfigs());
      expect(() => unmount()).not.toThrow();
    });
  });
});
