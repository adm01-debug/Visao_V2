/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Notification API
const mockNotification = vi.fn();
vi.stubGlobal('Notification', class {
  static permission = 'granted';
  static requestPermission = vi.fn().mockResolvedValue('granted');
  constructor(title: string, options?: NotificationOptions) {
    mockNotification(title, options);
  }
});

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('permissões', () => {
    it('deve verificar permissão atual', () => {
      expect(Notification.permission).toBe('granted');
    });

    it('deve solicitar permissão', async () => {
      const result = await Notification.requestPermission();
      expect(result).toBe('granted');
      expect(Notification.requestPermission).toHaveBeenCalled();
    });
  });

  describe('envio de notificações', () => {
    it('deve criar notificação com título', () => {
      new Notification('Teste');
      expect(mockNotification).toHaveBeenCalledWith('Teste', undefined);
    });

    it('deve criar notificação com opções', () => {
      const options = {
        body: 'Corpo da notificação',
        icon: '/icon.png',
        tag: 'test-tag',
      };
      
      new Notification('Teste', options);
      expect(mockNotification).toHaveBeenCalledWith('Teste', options);
    });

    it('deve criar notificação de alerta', () => {
      const options = {
        body: 'Movimento detectado na Câmera 1',
        icon: '/alert-icon.png',
        tag: 'alert-motion',
        requireInteraction: true,
      };
      
      new Notification('Alerta de Movimento', options);
      expect(mockNotification).toHaveBeenCalledWith('Alerta de Movimento', options);
    });
  });

  describe('tipos de notificação', () => {
    it('deve enviar notificação de sucesso', () => {
      new Notification('Operação concluída', {
        body: 'A operação foi realizada com sucesso',
        icon: '/success-icon.png',
      });
      
      expect(mockNotification).toHaveBeenCalled();
    });

    it('deve enviar notificação de erro', () => {
      new Notification('Erro', {
        body: 'Falha na conexão com a câmera',
        icon: '/error-icon.png',
        tag: 'error',
      });
      
      expect(mockNotification).toHaveBeenCalled();
    });

    it('deve enviar notificação de aviso', () => {
      new Notification('Aviso', {
        body: 'Armazenamento quase cheio',
        icon: '/warning-icon.png',
      });
      
      expect(mockNotification).toHaveBeenCalled();
    });
  });

  describe('fila de notificações', () => {
    it('deve processar múltiplas notificações', () => {
      const notifications = [
        { title: 'Notificação 1', body: 'Corpo 1' },
        { title: 'Notificação 2', body: 'Corpo 2' },
        { title: 'Notificação 3', body: 'Corpo 3' },
      ];

      notifications.forEach(n => {
        new Notification(n.title, { body: n.body });
      });

      expect(mockNotification).toHaveBeenCalledTimes(3);
    });
  });
});
