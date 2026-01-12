import { describe, it, expect, vi, beforeEach } from 'vitest';
import { browser } from '../browser';

describe('browser', () => {
  describe('detection', () => {
    it('should detect mobile', () => {
      expect(typeof browser.isMobile()).toBe('boolean');
    });

    it('should detect touch device', () => {
      expect(typeof browser.isTouchDevice()).toBe('boolean');
    });

    it('should get language', () => {
      expect(browser.getLanguage()).toBeDefined();
    });
  });

  describe('feature detection', () => {
    it('should check WebGL support', () => {
      expect(typeof browser.supportsWebGL()).toBe('boolean');
    });

    it('should check WebRTC support', () => {
      expect(typeof browser.supportsWebRTC()).toBe('boolean');
    });
  });
});
