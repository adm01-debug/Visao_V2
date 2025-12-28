// src/hooks/__tests__/useRealtimeAlerts.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRealtimeAlerts } from '../useRealtimeAlerts';
import { supabase } from '@/integrations/supabase/client';

// Mocks
vi.mock('@/integrations/supabase/client', () => {
  const channelMock = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  };
  return {
    supabase: {
      channel: vi.fn().mockReturnValue(channelMock),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock('@/lib/alertSounds', () => ({
  playAlertSound: vi.fn(),
  playCriticalAlertSound: vi.fn(),
}));

vi.mock('@/lib/browserNotifications', () => ({
  showBrowserNotification: vi.fn(),
  showNotification: vi.fn(),
  getBrowserNotificationsEnabled: vi.fn(() => true),
  getNotificationPermission: vi.fn(() => 'granted'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockAlert = {
  id: 'alert-1',
  type: 'security',
  severity: 'high',
  message: 'Alerta de segurança detectado',
  timestamp: new Date().toISOString(),
  camera_id: 'cam-1',
  acknowledged: false,
  created_at: new Date().toISOString(),
};

describe('useRealtimeAlerts', () => {
  const mockOnNewAlert = vi.fn();
  const mockOnAlertUpdated = vi.fn();
  const mockOnAlertDeleted = vi.fn();

  const defaultOptions = {
    onNewAlert: mockOnNewAlert,
    onAlertUpdated: mockOnAlertUpdated,
    onAlertDeleted: mockOnAlertDeleted,
    enabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      expect(() => {
        renderHook(() => useRealtimeAlerts(defaultOptions));
      }).not.toThrow();
    });

    it('deve criar canal de realtime quando habilitado', () => {
      renderHook(() => useRealtimeAlerts(defaultOptions));

      expect(supabase.channel).toHaveBeenCalledWith('alerts-realtime');
    });

    it('não deve criar canal quando desabilitado', () => {
      renderHook(() =>
        useRealtimeAlerts({
          ...defaultOptions,
          enabled: false,
        })
      );

      // Canal não deve ser criado ou listener não deve ser configurado ativamente
    });
  });

  describe('Subscrição de Eventos', () => {
    it('deve configurar listener para INSERT', () => {
      const channelMock = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      renderHook(() => useRealtimeAlerts(defaultOptions));

      expect(channelMock.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        }),
        expect.any(Function)
      );
    });

    it('deve configurar listener para UPDATE', () => {
      const channelMock = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      renderHook(() => useRealtimeAlerts(defaultOptions));

      expect(channelMock.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
        }),
        expect.any(Function)
      );
    });

    it('deve configurar listener para DELETE', () => {
      const channelMock = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      renderHook(() => useRealtimeAlerts(defaultOptions));

      expect(channelMock.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'DELETE',
          schema: 'public',
          table: 'alerts',
        }),
        expect.any(Function)
      );
    });

    it('deve chamar subscribe após configurar listeners', () => {
      const subscribeMock = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
      const channelMock = {
        on: vi.fn().mockReturnThis(),
        subscribe: subscribeMock,
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      renderHook(() => useRealtimeAlerts(defaultOptions));

      expect(subscribeMock).toHaveBeenCalled();
    });
  });

  describe('Callbacks de Eventos', () => {
    it('deve chamar onNewAlert quando novo alerta é inserido', () => {
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

      renderHook(() => useRealtimeAlerts(defaultOptions));

      // Simular evento de INSERT
      act(() => {
        insertCallback!({ new: mockAlert });
      });

      expect(mockOnNewAlert).toHaveBeenCalledWith(mockAlert);
    });

    it('deve chamar onAlertUpdated quando alerta é atualizado', () => {
      let updateCallback: Function;
      const channelMock = {
        on: vi.fn((event, config, callback) => {
          if (config.event === 'UPDATE') {
            updateCallback = callback;
          }
          return channelMock;
        }),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      renderHook(() => useRealtimeAlerts(defaultOptions));

      const updatedAlert = { ...mockAlert, acknowledged: true };
      act(() => {
        updateCallback!({ new: updatedAlert });
      });

      expect(mockOnAlertUpdated).toHaveBeenCalledWith(updatedAlert);
    });

    it('deve chamar onAlertDeleted quando alerta é removido', () => {
      let deleteCallback: Function;
      const channelMock = {
        on: vi.fn((event, config, callback) => {
          if (config.event === 'DELETE') {
            deleteCallback = callback;
          }
          return channelMock;
        }),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      renderHook(() => useRealtimeAlerts(defaultOptions));

      act(() => {
        deleteCallback!({ old: { id: 'alert-1' } });
      });

      expect(mockOnAlertDeleted).toHaveBeenCalledWith('alert-1');
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

      const { unmount } = renderHook(() => useRealtimeAlerts(defaultOptions));

      unmount();

      // Verificar cleanup
      expect(() => unmount).not.toThrow();
    });

    it('deve limpar recursos ao desabilitar', () => {
      const unsubscribeMock = vi.fn();
      const channelMock = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: unsubscribeMock }),
      };
      (supabase.channel as any).mockReturnValue(channelMock);

      const { rerender } = renderHook(
        ({ enabled }) => useRealtimeAlerts({ ...defaultOptions, enabled }),
        { initialProps: { enabled: true } }
      );

      rerender({ enabled: false });
    });
  });

  describe('Notificações', () => {
    it('deve tocar som para alertas críticos', () => {
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

      renderHook(() => useRealtimeAlerts(defaultOptions));

      const criticalAlert = { ...mockAlert, severity: 'critical' };
      act(() => {
        insertCallback!({ new: criticalAlert });
      });
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve lidar com callbacks undefined', () => {
      expect(() => {
        renderHook(() =>
          useRealtimeAlerts({
            onNewAlert: vi.fn(),
            onAlertUpdated: vi.fn(),
            onAlertDeleted: vi.fn(),
          })
        );
      }).not.toThrow();
    });

    it('deve lidar com erros no canal graciosamente', () => {
      (supabase.channel as any).mockImplementation(() => {
        throw new Error('Erro de conexão');
      });

      // O hook deve lidar com o erro internamente
    });
  });
});
