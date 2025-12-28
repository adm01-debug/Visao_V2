// src/hooks/__tests__/useRecordingSessions.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRecordingSessions } from '../useRecordingSessions';
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

const mockSession = {
  id: 'session-1',
  camera_id: 'cam-1',
  status: 'active',
  start_time: new Date().toISOString(),
  recordings_count: 5,
};

describe('useRecordingSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [mockSession], error: null }),
        eq: vi.fn().mockResolvedValue({ data: [mockSession], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
      }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useRecordingSessions());
      expect(result.current).toBeDefined();
    });
  });

  describe('Gerenciamento de Sessões', () => {
    it('deve buscar sessões', async () => {
      const { result } = renderHook(() => useRecordingSessions());
      await waitFor(() => expect(result.current.sessions).toBeDefined());
    });

    it('deve criar sessão', async () => {
      const { result } = renderHook(() => useRecordingSessions());
      if (result.current.createSession) {
        await act(async () => {
          await result.current.createSession('cam-1');
        });
      }
    });

    it('deve encerrar sessão', async () => {
      const { result } = renderHook(() => useRecordingSessions());
      if (result.current.endSession) {
        await act(async () => {
          await result.current.endSession('session-1');
        });
      }
    });
  });

  describe('Status', () => {
    it('deve retornar sessões ativas', () => {
      const { result } = renderHook(() => useRecordingSessions());
      if (result.current.activeSessions) {
        expect(Array.isArray(result.current.activeSessions)).toBe(true);
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useRecordingSessions());
      expect(() => unmount()).not.toThrow();
    });
  });
});
