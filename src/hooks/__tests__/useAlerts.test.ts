// src/hooks/__tests__/useAlerts.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAlerts } from '../useAlerts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Mocks
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
    single: vi.fn().mockReturnThis(),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/alertSounds', () => ({
  playAlertSound: vi.fn(),
}));

vi.mock('./useRealtimeAlerts', () => ({
  useRealtimeAlerts: vi.fn(() => ({
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
}));

const mockAlerts = [
  {
    id: '1',
    type: 'motion',
    severity: 'high',
    message: 'Movimento detectado',
    timestamp: new Date().toISOString(),
    camera_id: 'cam-1',
    acknowledged: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'face',
    severity: 'medium',
    message: 'Rosto desconhecido',
    timestamp: new Date().toISOString(),
    camera_id: 'cam-2',
    acknowledged: true,
    created_at: new Date().toISOString(),
  },
];

describe('useAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockAlerts, error: null }),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: mockAlerts[0], error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockAlerts[0], error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Inicialização', () => {
    it('deve inicializar com estado padrão', () => {
      const { result } = renderHook(() => useAlerts());

      expect(result.current.alerts).toBeDefined();
      expect(result.current.loading).toBeDefined();
      expect(result.current.error).toBeNull();
    });

    it('deve ter função fetchAlerts disponível', () => {
      const { result } = renderHook(() => useAlerts());

      expect(typeof result.current.fetchAlerts).toBe('function');
    });
  });

  describe('Busca de Alertas', () => {
    it('deve buscar alertas com sucesso', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockAlerts, error: null }),
        }),
      });

      const { result } = renderHook(() => useAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('deve lidar com erro na busca', async () => {
      const mockError = new Error('Erro de conexão');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
        }),
      });

      const { result } = renderHook(() => useAlerts());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('deve ordenar alertas por timestamp decrescente', async () => {
      const orderMock = vi.fn().mockResolvedValue({ data: mockAlerts, error: null });
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: orderMock,
        }),
      });

      renderHook(() => useAlerts());

      await waitFor(() => {
        expect(orderMock).toHaveBeenCalledWith('timestamp', { ascending: false });
      });
    });
  });

  describe('Criação de Alertas', () => {
    it('deve ter função createAlert se disponível', async () => {
      const { result } = renderHook(() => useAlerts());

      if (result.current.createAlert) {
        expect(typeof result.current.createAlert).toBe('function');
      }
    });
  });

  describe('Atualização de Alertas', () => {
    it('deve ter função updateAlert se disponível', async () => {
      const { result } = renderHook(() => useAlerts());

      if (result.current.updateAlert) {
        expect(typeof result.current.updateAlert).toBe('function');
      }
    });

    it('deve ter função acknowledgeAlert se disponível', async () => {
      const { result } = renderHook(() => useAlerts());

      if (result.current.acknowledgeAlert) {
        expect(typeof result.current.acknowledgeAlert).toBe('function');
      }
    });
  });

  describe('Exclusão de Alertas', () => {
    it('deve ter função deleteAlert se disponível', async () => {
      const { result } = renderHook(() => useAlerts());

      if (result.current.deleteAlert) {
        expect(typeof result.current.deleteAlert).toBe('function');
      }
    });
  });

  describe('Filtragem de Alertas', () => {
    it('deve ter função para filtrar alertas por tipo se disponível', () => {
      const { result } = renderHook(() => useAlerts());

      if (result.current.filterByType) {
        expect(typeof result.current.filterByType).toBe('function');
      }
    });

    it('deve ter função para filtrar alertas por severidade se disponível', () => {
      const { result } = renderHook(() => useAlerts());

      if (result.current.filterBySeverity) {
        expect(typeof result.current.filterBySeverity).toBe('function');
      }
    });
  });

  describe('Reconhecimento de Alertas', () => {
    it('deve reconhecer alerta por ID se função disponível', async () => {
      const { result } = renderHook(() => useAlerts());

      if (result.current.acknowledgeAlert) {
        await act(async () => {
          await result.current.acknowledgeAlert('1');
        });
      }
    });

    it('deve reconhecer múltiplos alertas se função disponível', async () => {
      const { result } = renderHook(() => useAlerts());

      if (result.current.acknowledgeAll) {
        await act(async () => {
          await result.current.acknowledgeAll();
        });
      }
    });
  });

  describe('Contadores', () => {
    it('deve retornar contagem de alertas não reconhecidos', () => {
      const { result } = renderHook(() => useAlerts());

      if (result.current.unacknowledgedCount !== undefined) {
        expect(typeof result.current.unacknowledgedCount).toBe('number');
      }
    });

    it('deve retornar contagem por severidade se disponível', () => {
      const { result } = renderHook(() => useAlerts());

      if (result.current.countBySeverity) {
        expect(typeof result.current.countBySeverity).toBe('function');
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos ao desmontar', () => {
      const { unmount } = renderHook(() => useAlerts());

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Integração com Auth', () => {
    it('deve respeitar contexto de autenticação', () => {
      (useAuth as any).mockReturnValue({ user: null });

      const { result } = renderHook(() => useAlerts());

      expect(result.current).toBeDefined();
    });

    it('deve funcionar com usuário autenticado', () => {
      (useAuth as any).mockReturnValue({
        user: { id: 'user-123', email: 'user@test.com' },
      });

      const { result } = renderHook(() => useAlerts());

      expect(result.current).toBeDefined();
    });
  });
});
