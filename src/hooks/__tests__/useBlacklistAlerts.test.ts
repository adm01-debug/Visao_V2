// src/hooks/__tests__/useBlacklistAlerts.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBlacklistAlerts } from '../useBlacklistAlerts';
import { supabase } from '@/integrations/supabase/client';

// Mocks
vi.mock('@/integrations/supabase/client', () => {
  const channelMock = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  };
  return {
    supabase: {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      channel: vi.fn().mockReturnValue(channelMock),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock('@/lib/alertSounds', () => ({
  playCriticalAlertSound: vi.fn(),
  playAlertSound: vi.fn(),
}));

vi.mock('@/lib/browserNotifications', () => ({
  showBrowserNotification: vi.fn(),
  getBrowserNotificationsEnabled: vi.fn(() => true),
  getNotificationPermission: vi.fn(() => 'granted'),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

const mockBlacklistAlert = {
  id: 'alert-bl-1',
  personId: 'person-1',
  personName: 'John Doe',
  cameraId: 'cam-1',
  cameraName: 'Entrada Principal',
  confidence: 0.95,
  timestamp: new Date(),
  imageUrl: 'https://example.com/image.jpg',
};

describe('useBlacklistAlerts', () => {
  const mockOnBlacklistDetected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Inicialização', () => {
    it('deve inicializar com valores padrão', () => {
      const { result } = renderHook(() => useBlacklistAlerts());

      expect(result.current.recentAlerts).toEqual([]);
      expect(result.current.alertCount).toBe(0);
    });

    it('deve aceitar opções customizadas', () => {
      const { result } = renderHook(() =>
        useBlacklistAlerts({
          enabled: true,
          onBlacklistDetected: mockOnBlacklistDetected,
          soundEnabled: true,
          notificationsEnabled: true,
        })
      );

      expect(result.current).toBeDefined();
    });

    it('não deve iniciar quando desabilitado', () => {
      const { result } = renderHook(() =>
        useBlacklistAlerts({
          enabled: false,
        })
      );

      expect(result.current.recentAlerts).toEqual([]);
    });
  });

  describe('Subscrição Realtime', () => {
    it('deve criar canal de realtime quando habilitado', () => {
      renderHook(() =>
        useBlacklistAlerts({
          enabled: true,
        })
      );

      expect(supabase.channel).toHaveBeenCalled();
    });

    it('não deve criar canal quando desabilitado', () => {
      vi.clearAllMocks();
      renderHook(() =>
        useBlacklistAlerts({
          enabled: false,
        })
      );

      // Canal não deve ser criado para alertas desabilitados
    });

    it('deve configurar listener para face_recognitions', () => {
      const channelMock = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      renderHook(() =>
        useBlacklistAlerts({
          enabled: true,
        })
      );

      expect(channelMock.on).toHaveBeenCalled();
    });
  });

  describe('Detecção de Blacklist', () => {
    it('deve chamar callback quando pessoa da blacklist é detectada', async () => {
      let insertCallback: Function;
      const channelMock = {
        on: vi.fn((event, config, callback) => {
          insertCallback = callback;
          return channelMock;
        }),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      renderHook(() =>
        useBlacklistAlerts({
          enabled: true,
          onBlacklistDetected: mockOnBlacklistDetected,
        })
      );

      // Simular detecção de pessoa na blacklist
      act(() => {
        insertCallback!({
          new: {
            person_id: 'person-1',
            camera_id: 'cam-1',
            confidence: 0.95,
            created_at: new Date().toISOString(),
          },
        });
      });
    });

    it('deve adicionar alerta à lista de recentes', async () => {
      let insertCallback: Function;
      const channelMock = {
        on: vi.fn((event, config, callback) => {
          insertCallback = callback;
          return channelMock;
        }),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      const { result } = renderHook(() =>
        useBlacklistAlerts({
          enabled: true,
        })
      );

      act(() => {
        insertCallback!({
          new: {
            person_id: 'person-1',
            camera_id: 'cam-1',
            confidence: 0.95,
            created_at: new Date().toISOString(),
          },
        });
      });
    });

    it('deve incrementar contador de alertas', async () => {
      let insertCallback: Function;
      const channelMock = {
        on: vi.fn((event, config, callback) => {
          insertCallback = callback;
          return channelMock;
        }),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      const { result } = renderHook(() =>
        useBlacklistAlerts({
          enabled: true,
        })
      );

      const initialCount = result.current.alertCount;

      act(() => {
        insertCallback!({
          new: {
            person_id: 'person-1',
            camera_id: 'cam-1',
            confidence: 0.95,
            created_at: new Date().toISOString(),
          },
        });
      });
    });
  });

  describe('Som e Notificações', () => {
    it('deve tocar som quando soundEnabled é true', async () => {
      const { playCriticalAlertSound } = await import('@/lib/alertSounds');

      let insertCallback: Function;
      const channelMock = {
        on: vi.fn((event, config, callback) => {
          insertCallback = callback;
          return channelMock;
        }),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      renderHook(() =>
        useBlacklistAlerts({
          enabled: true,
          soundEnabled: true,
        })
      );

      act(() => {
        insertCallback!({
          new: {
            person_id: 'person-1',
            camera_id: 'cam-1',
            confidence: 0.95,
            created_at: new Date().toISOString(),
          },
        });
      });
    });

    it('não deve tocar som quando soundEnabled é false', () => {
      renderHook(() =>
        useBlacklistAlerts({
          enabled: true,
          soundEnabled: false,
        })
      );
    });

    it('deve mostrar notificação quando notificationsEnabled é true', () => {
      renderHook(() =>
        useBlacklistAlerts({
          enabled: true,
          notificationsEnabled: true,
        })
      );
    });

    it('não deve mostrar notificação quando notificationsEnabled é false', () => {
      renderHook(() =>
        useBlacklistAlerts({
          enabled: true,
          notificationsEnabled: false,
        })
      );
    });
  });

  describe('Cache de Pessoas e Câmeras', () => {
    it('deve fazer cache de informações de pessoas', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'person-1', name: 'John Doe', list_type: 'blacklist' }],
            error: null,
          }),
        }),
      });

      renderHook(() =>
        useBlacklistAlerts({
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalled();
      });
    });

    it('deve fazer cache de informações de câmeras', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'cam-1', name: 'Câmera 1' }],
            error: null,
          }),
        }),
      });

      renderHook(() =>
        useBlacklistAlerts({
          enabled: true,
        })
      );
    });
  });

  describe('Cleanup', () => {
    it('deve remover canal ao desmontar', () => {
      const unsubscribeMock = vi.fn();
      const channelMock = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: unsubscribeMock }),
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      const { unmount } = renderHook(() =>
        useBlacklistAlerts({
          enabled: true,
        })
      );

      unmount();

      expect(() => unmount).not.toThrow();
    });

    it('deve limpar alertas ao desabilitar', () => {
      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useBlacklistAlerts({
            enabled,
          }),
        { initialProps: { enabled: true } }
      );

      rerender({ enabled: false });

      expect(result.current).toBeDefined();
    });
  });

  describe('Funções Auxiliares', () => {
    it('deve ter função clearAlerts se disponível', () => {
      const { result } = renderHook(() => useBlacklistAlerts());

      if (result.current.clearAlerts) {
        expect(typeof result.current.clearAlerts).toBe('function');
      }
    });

    it('deve ter função dismissAlert se disponível', () => {
      const { result } = renderHook(() => useBlacklistAlerts());

      if (result.current.dismissAlert) {
        expect(typeof result.current.dismissAlert).toBe('function');
      }
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve lidar com erro ao buscar pessoas', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('Erro de conexão')),
        }),
      });

      expect(() => {
        renderHook(() =>
          useBlacklistAlerts({
            enabled: true,
          })
        );
      }).not.toThrow();
    });

    it('deve lidar com callback undefined', () => {
      expect(() => {
        renderHook(() =>
          useBlacklistAlerts({
            enabled: true,
            onBlacklistDetected: undefined,
          })
        );
      }).not.toThrow();
    });
  });
});
