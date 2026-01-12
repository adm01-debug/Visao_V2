import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isBrowser, isServer, isMobile, isOnline, getLanguage } from '../browserUtils';

describe('browserUtils', () => {
  describe('isBrowser', () => {
    it('should return true in browser', () => {
      expect(isBrowser()).toBe(true);
    });
  });

  describe('isServer', () => {
    it('should return false in browser', () => {
      expect(isServer()).toBe(false);
    });
  });

  describe('isMobile', () => {
    it('should detect mobile from user agent', () => {
      const originalUA = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true,
      });
      
      expect(isMobile()).toBe(true);
      
      Object.defineProperty(navigator, 'userAgent', { value: originalUA });
    });
  });

  describe('isOnline', () => {
    it('should return navigator.onLine', () => {
      expect(typeof isOnline()).toBe('boolean');
    });
  });

  describe('getLanguage', () => {
    it('should return browser language', () => {
      expect(typeof getLanguage()).toBe('string');
    });
  });
});
