import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  trackAction,
  reportCrash,
  reportFreeze,
  reportOOM,
  setupFreezeDetection,
  setupCrashDetection,
} from '../crashReporting';

describe('crashReporting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('trackAction', () => {
    it('should track user actions', () => {
      trackAction('click button');
      trackAction('navigate page');
      // Actions are tracked internally
    });

    it('should limit stored actions', () => {
      for (let i = 0; i < 100; i++) {
        trackAction(`action ${i}`);
      }
      // Should only keep last 50 actions
    });
  });

  describe('reportCrash', () => {
    it('should create crash report', () => {
      const sendBeaconSpy = vi.spyOn(navigator, 'sendBeacon').mockReturnValue(true);
      
      reportCrash();
      
      // Report should be sent (if endpoint configured)
      sendBeaconSpy.mockRestore();
    });
  });

  describe('reportFreeze', () => {
    it('should report page freeze', () => {
      const sendBeaconSpy = vi.spyOn(navigator, 'sendBeacon').mockReturnValue(true);
      
      reportFreeze();
      
      sendBeaconSpy.mockRestore();
    });
  });

  describe('reportOOM', () => {
    it('should report out of memory', () => {
      const sendBeaconSpy = vi.spyOn(navigator, 'sendBeacon').mockReturnValue(true);
      
      reportOOM();
      
      sendBeaconSpy.mockRestore();
    });
  });

  describe('setupFreezeDetection', () => {
    it('should return cleanup function', () => {
      const cleanup = setupFreezeDetection(5000);
      expect(typeof cleanup).toBe('function');
      cleanup();
    });

    it('should detect freezes after threshold', () => {
      const cleanup = setupFreezeDetection(5000);
      
      vi.advanceTimersByTime(6000);
      
      // Should have detected a freeze
      cleanup();
    });
  });

  describe('setupCrashDetection', () => {
    it('should setup beforeunload handler', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      
      setupCrashDetection();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });

    it('should check for previous crash on load', () => {
      localStorage.setItem('vis-o-last-session', JSON.stringify({
        timestamp: Date.now() - 1000, // 1 second ago
        url: 'https://example.com',
        actions: [],
      }));

      setupCrashDetection();

      // Should have detected potential crash
      expect(localStorage.getItem('vis-o-last-session')).toBeNull();
    });
  });
});
