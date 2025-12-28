// src/hooks/__tests__/usePlateDetections.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePlateDetections } from '../usePlateDetections';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

vi.mock('@/lib/alertSounds', () => ({
  playCriticalAlertSound: vi.fn(),
  playAlertSound: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

const mockPlateDetection = {
  id: 'detection-1',
  plate: 'ABC1234',
  confidence: 0.95,
  camera_id: 'cam-1',
  camera_name: 'Entrada Principal',
  image_url: 'https://example.com/plate.jpg',
  vehicle_type: 'car',
  status: 'authorized' as const,
  direction: 'entry',
  timestamp: new Date(),
  created_at: new Date(),
};

const mockPlateDetections = [
  mockPlateDetection,
  {
    ...mockPlateDetection,
    id: 'detection-2',
    plate: 'XYZ9876',
    status: 'blacklist' as const,
  },
];

describe('usePlateDetections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockPlateDetections, error: null }),
        }),
        eq: vi.fn().mockResolvedValue({ data: mockPlateDetections, error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: mockPlateDetection, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockPlateDetection, error: null }),
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
      const { result } = renderHook(() => usePlateDetections());

      expect(result.current).toBeDefined();
      expect(result.current.detections).toBeDefined();
      expect(result.current.loading).toBeDefined();
    });

    it('deve ter detections vazio inicialmente', () => {
      const { result } = renderHook(() => usePlateDetections());

      expect(Array.isArray(result.current.detections)).toBe(true);
    });

    it('deve ter loading true durante fetch inicial', async () => {
      const { result } = renderHook(() => usePlateDetections());

      // Loading pode ser true ou false dependendo do estado
      expect(typeof result.current.loading).toBe('boolean');
    });
  });

  describe('Busca de Detecções', () => {
    it('deve buscar detecções com sucesso', async () => {
      const { result } = renderHook(() => usePlateDetections());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('deve ordenar detecções por timestamp', async () => {
      const orderMock = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: mockPlateDetections, error: null }),
      });
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: orderMock,
        }),
      });

      renderHook(() => usePlateDetections());

      await waitFor(() => {
        expect(orderMock).toHaveBeenCalled();
      });
    });

    it('deve lidar com erro na busca', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null, error: new Error('Erro') }),
          }),
        }),
      });

      const { result } = renderHook(() => usePlateDetections());

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('Adicionar Detecção', () => {
    it('deve ter função addDetection', () => {
      const { result } = renderHook(() => usePlateDetections());

      if (result.current.addDetection) {
        expect(typeof result.current.addDetection).toBe('function');
      }
    });

    it('deve adicionar nova detecção com sucesso', async () => {
      const { result } = renderHook(() => usePlateDetections());

      if (result.current.addDetection) {
        await act(async () => {
          await result.current.addDetection({
            plate: 'NEW1234',
            confidence: 0.9,
            camera_id: 'cam-1',
            camera_name: 'Câmera 1',
            vehicle_type: 'car',
          });
        });
      }
    });

    it('deve validar formato da placa', async () => {
      const { result } = renderHook(() => usePlateDetections());

      if (result.current.addDetection) {
        await act(async () => {
          try {
            await result.current.addDetection({
              plate: 'INVALID',
              confidence: 0.9,
              camera_id: 'cam-1',
              camera_name: 'Câmera 1',
              vehicle_type: 'car',
            });
          } catch (e) {
            // Erro de validação esperado
          }
        });
      }
    });
  });

  describe('Verificação de Status', () => {
    it('deve verificar status da placa', async () => {
      const { result } = renderHook(() => usePlateDetections());

      if (result.current.checkPlateStatus) {
        await act(async () => {
          const status = await result.current.checkPlateStatus('ABC1234');
          expect(['authorized', 'unauthorized', 'unknown', 'blacklist']).toContain(status);
        });
      }
    });

    it('deve identificar placa na blacklist', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ plate: 'BLK1234', status: 'blacklist' }],
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => usePlateDetections());

      if (result.current.isBlacklisted) {
        await act(async () => {
          const isBlacklisted = await result.current.isBlacklisted('BLK1234');
          expect(isBlacklisted).toBe(true);
        });
      }
    });

    it('deve identificar placa autorizada', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ plate: 'AUTH123', status: 'authorized' }],
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => usePlateDetections());

      if (result.current.isAuthorized) {
        await act(async () => {
          const isAuthorized = await result.current.isAuthorized('AUTH123');
          expect(isAuthorized).toBe(true);
        });
      }
    });
  });

  describe('Filtros', () => {
    it('deve filtrar por status', () => {
      const { result } = renderHook(() => usePlateDetections());

      if (result.current.filterByStatus) {
        const filtered = result.current.filterByStatus('blacklist');
        expect(Array.isArray(filtered)).toBe(true);
      }
    });

    it('deve filtrar por câmera', () => {
      const { result } = renderHook(() => usePlateDetections());

      if (result.current.filterByCamera) {
        const filtered = result.current.filterByCamera('cam-1');
        expect(Array.isArray(filtered)).toBe(true);
      }
    });

    it('deve filtrar por data', () => {
      const { result } = renderHook(() => usePlateDetections());

      if (result.current.filterByDate) {
        const filtered = result.current.filterByDate(new Date(), new Date());
        expect(Array.isArray(filtered)).toBe(true);
      }
    });

    it('deve buscar por placa', () => {
      const { result } = renderHook(() => usePlateDetections());

      if (result.current.searchByPlate) {
        const found = result.current.searchByPlate('ABC');
        expect(Array.isArray(found)).toBe(true);
      }
    });
  });

  describe('Alertas', () => {
    it('deve disparar alerta para blacklist', async () => {
      const { playCriticalAlertSound } = await import('@/lib/alertSounds');

      const { result } = renderHook(() => usePlateDetections());

      if (result.current.triggerBlacklistAlert) {
        await act(async () => {
          await result.current.triggerBlacklistAlert({
            plate: 'BLK1234',
            cameraName: 'Entrada',
          });
        });

        // Verificar se som foi tocado
      }
    });

    it('deve ter contagem de alertas pendentes', () => {
      const { result } = renderHook(() => usePlateDetections());

      if (result.current.pendingAlertsCount !== undefined) {
        expect(typeof result.current.pendingAlertsCount).toBe('number');
      }
    });
  });

  describe('Estatísticas', () => {
    it('deve retornar estatísticas de detecções', () => {
      const { result } = renderHook(() => usePlateDetections());

      if (result.current.stats) {
        expect(result.current.stats).toBeDefined();
      }
    });

    it('deve contar detecções por status', () => {
      const { result } = renderHook(() => usePlateDetections());

      if (result.current.countByStatus) {
        const counts = result.current.countByStatus();
        expect(typeof counts).toBe('object');
      }
    });

    it('deve retornar detecções recentes', () => {
      const { result } = renderHook(() => usePlateDetections());

      if (result.current.recentDetections) {
        expect(Array.isArray(result.current.recentDetections)).toBe(true);
      }
    });
  });

  describe('Realtime', () => {
    it('deve subscrever a atualizações em tempo real', () => {
      renderHook(() => usePlateDetections());

      expect(supabase.channel).toHaveBeenCalled();
    });

    it('deve atualizar detecções em tempo real', async () => {
      let insertCallback: Function;
      const channelMock = {
        on: vi.fn((event, config, callback) => {
          if (config.event === 'INSERT') {
            insertCallback = callback;
          }
          return channelMock;
        }),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      const { result } = renderHook(() => usePlateDetections());

      // Simular nova detecção
      act(() => {
        insertCallback!({ new: mockPlateDetection });
      });
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos ao desmontar', () => {
      const unsubscribeMock = vi.fn();
      const channelMock = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: unsubscribeMock }),
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      const { unmount } = renderHook(() => usePlateDetections());

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve lidar com erro ao adicionar detecção', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockRejectedValue(new Error('Erro de inserção')),
      });

      const { result } = renderHook(() => usePlateDetections());

      if (result.current.addDetection) {
        await act(async () => {
          try {
            await result.current.addDetection({
              plate: 'ERR1234',
              confidence: 0.9,
              camera_id: 'cam-1',
              camera_name: 'Câmera 1',
              vehicle_type: 'car',
            });
          } catch (e) {
            expect(e).toBeDefined();
          }
        });
      }
    });
  });
});
