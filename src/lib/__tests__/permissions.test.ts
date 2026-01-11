import { describe, it, expect, vi } from 'vitest';
import { checkPermission, hasPermission, requestPermission, PermissionType } from '../permissions';

describe('permissions utilities', () => {
  describe('checkPermission', () => {
    it('checks permission state', async () => {
      const mockQuery = vi.fn().mockResolvedValue({ state: 'granted' });
      Object.assign(navigator, { permissions: { query: mockQuery } });
      
      const result = await checkPermission('camera');
      expect(result).toBe('granted');
    });
  });

  describe('hasPermission', () => {
    it('returns true for granted permission', async () => {
      const mockQuery = vi.fn().mockResolvedValue({ state: 'granted' });
      Object.assign(navigator, { permissions: { query: mockQuery } });
      
      const result = await hasPermission('camera');
      expect(result).toBe(true);
    });
  });

  describe('requestPermission', () => {
    it('requests permission', async () => {
      const mockRequest = vi.fn().mockResolvedValue('granted');
      Object.assign(Notification, { requestPermission: mockRequest });
      
      const result = await requestPermission('notifications');
      expect(result).toBeDefined();
    });
  });
});
