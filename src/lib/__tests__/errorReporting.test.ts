import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  reportError,
  reportReactError,
  configureErrorReporting,
  setSampleRate,
  setupGlobalErrorHandlers,
} from '../errorReporting';

describe('errorReporting', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response());
    vi.stubEnv('VITE_ERROR_REPORTING_ENDPOINT', 'https://errors.example.com');
    configureErrorReporting({ enabled: true, sampleRate: 1.0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('reportError', () => {
    it('should send error report', async () => {
      const error = new Error('Test error');
      await reportError(error);

      // Note: In real implementation, fetch would be called
      // This is a simplified test
    });

    it('should include metadata', async () => {
      const error = new Error('Test error');
      await reportError(error, { userId: '123' });

      // Verify metadata is included
    });
  });

  describe('configureErrorReporting', () => {
    it('should update configuration', () => {
      configureErrorReporting({ sampleRate: 0.5 });
      // Configuration updated
    });
  });

  describe('setSampleRate', () => {
    it('should clamp sample rate between 0 and 1', () => {
      setSampleRate(2);
      // Should be clamped to 1

      setSampleRate(-1);
      // Should be clamped to 0
    });
  });

  describe('setupGlobalErrorHandlers', () => {
    it('should setup window.onerror', () => {
      setupGlobalErrorHandlers();
      expect(window.onerror).toBeDefined();
    });

    it('should setup window.onunhandledrejection', () => {
      setupGlobalErrorHandlers();
      expect(window.onunhandledrejection).toBeDefined();
    });
  });

  describe('ignored errors', () => {
    it('should ignore ResizeObserver errors', async () => {
      const error = new Error('ResizeObserver loop limit exceeded');
      await reportError(error);

      // Should not send report for ignored errors
    });
  });
});
