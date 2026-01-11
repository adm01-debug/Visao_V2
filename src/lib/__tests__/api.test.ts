import { describe, it, expect, vi } from 'vitest';
import { createApiClient, handleApiError, buildQueryString } from '../api';

describe('api utilities', () => {
  describe('createApiClient', () => {
    it('creates api client with base URL', () => {
      const client = createApiClient({ baseURL: 'https://api.test.com' });
      expect(client).toBeDefined();
      expect(client.get).toBeDefined();
      expect(client.post).toBeDefined();
    });
  });

  describe('handleApiError', () => {
    it('handles API errors', () => {
      const error = { response: { status: 404, data: { message: 'Not found' } } };
      const handled = handleApiError(error);
      expect(handled.message).toBe('Not found');
    });
  });

  describe('buildQueryString', () => {
    it('builds query string from params', () => {
      const result = buildQueryString({ a: 1, b: 'test' });
      expect(result).toBe('a=1&b=test');
    });
    it('handles empty params', () => {
      expect(buildQueryString({})).toBe('');
    });
  });
});
