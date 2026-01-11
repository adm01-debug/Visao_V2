import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showNotification, requestNotificationPermission, isNotificationSupported } from '../notifications';

describe('notifications utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isNotificationSupported', () => {
    it('checks notification support', () => {
      expect(typeof isNotificationSupported()).toBe('boolean');
    });
  });

  describe('requestNotificationPermission', () => {
    it('requests permission', async () => {
      Object.assign(Notification, { requestPermission: vi.fn().mockResolvedValue('granted') });
      const result = await requestNotificationPermission();
      expect(result).toBe('granted');
    });
  });

  describe('showNotification', () => {
    it('shows notification when granted', async () => {
      Object.assign(Notification, {
        permission: 'granted',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      });
      const MockNotification = vi.fn();
      global.Notification = MockNotification as any;
      MockNotification.permission = 'granted';
      
      await showNotification('Test', { body: 'Body' });
      expect(MockNotification).toHaveBeenCalledWith('Test', expect.objectContaining({ body: 'Body' }));
    });
  });
});
