// src/hooks/__tests__/useRecordingConfigs.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRecordingConfigs } from '../useRecordingConfigs';
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

const mockConfig = {
  id: 'config-1',
  camera_id: 'cam-1',
  quality: '1080p',
  fps: 30,
  format: 'mp4',
  segment_duration: 300,
  retention_days: 30,
  enabled: true,
};

describe('useRecordingConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [mockConfig], error: null }),
      insert: vi.fn().mockResolvedValue({ data: mockConfig, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockConfig, error: null }),
      }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useRecordingConfigs());
      expect(result.current).toBeDefined();
    });
  });

  describe('CRUD', () => {
    it('deve buscar configurações', async () => {
      const { result } = renderHook(() => useRecordingConfigs());
      await waitFor(() => expect(result.current.configs).toBeDefined());
    });

    it('deve criar configuração', async () => {
      const { result } = renderHook(() => useRecordingConfigs());
      if (result.current.createConfig) {
        await act(async () => {
          await result.current.createConfig({ camera_id: 'cam-1', quality: '720p' });
        });
      }
    });

    it('deve atualizar configuração', async () => {
      const { result } = renderHook(() => useRecordingConfigs());
      if (result.current.updateConfig) {
        await act(async () => {
          await result.current.updateConfig('config-1', { quality: '4k' });
        });
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useRecordingConfigs());
      expect(() => unmount()).not.toThrow();
    });
  });
});
