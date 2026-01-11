import { describe, it, expect, vi } from 'vitest';
import { handleError, createErrorHandler, ErrorType, formatErrorMessage } from '../errorHandler';

describe('errorHandler utilities', () => {
  describe('handleError', () => {
    it('handles Error instance', () => {
      const error = new Error('Test error');
      const result = handleError(error);
      expect(result.message).toBe('Test error');
    });
    it('handles string error', () => {
      const result = handleError('String error');
      expect(result.message).toBe('String error');
    });
  });

  describe('createErrorHandler', () => {
    it('creates error handler with custom logic', () => {
      const onError = vi.fn();
      const handler = createErrorHandler({ onError });
      handler(new Error('test'));
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('formatErrorMessage', () => {
    it('formats error message', () => {
      const error = { code: 'NOT_FOUND', message: 'Resource not found' };
      expect(formatErrorMessage(error)).toContain('NOT_FOUND');
    });
  });
});
