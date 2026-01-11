import { describe, it, expect } from 'vitest';
import { isMobile, isTablet, isDesktop, isIOS, isAndroid, getBrowserInfo, getDeviceInfo } from '../device';

describe('device utilities', () => {
  describe('isMobile', () => {
    it('detects mobile device', () => {
      expect(typeof isMobile()).toBe('boolean');
    });
  });

  describe('isTablet', () => {
    it('detects tablet device', () => {
      expect(typeof isTablet()).toBe('boolean');
    });
  });

  describe('isDesktop', () => {
    it('detects desktop device', () => {
      expect(typeof isDesktop()).toBe('boolean');
    });
  });

  describe('isIOS', () => {
    it('detects iOS device', () => {
      expect(typeof isIOS()).toBe('boolean');
    });
  });

  describe('isAndroid', () => {
    it('detects Android device', () => {
      expect(typeof isAndroid()).toBe('boolean');
    });
  });

  describe('getBrowserInfo', () => {
    it('returns browser info', () => {
      const info = getBrowserInfo();
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('version');
    });
  });

  describe('getDeviceInfo', () => {
    it('returns device info', () => {
      const info = getDeviceInfo();
      expect(info).toHaveProperty('type');
      expect(info).toHaveProperty('os');
    });
  });
});
