import { describe, it, expect, vi, beforeEach } from 'vitest';
import { httpClient, get, post, put, del } from '../httpClient';

global.fetch = vi.fn();

describe('httpClient utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('makes GET request', async () => {
      (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: 1 }) });
      await get('/test');
      expect(fetch).toHaveBeenCalledWith('/test', expect.objectContaining({ method: 'GET' }));
    });
  });

  describe('post', () => {
    it('makes POST request', async () => {
      (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: 1 }) });
      await post('/test', { body: { a: 1 } });
      expect(fetch).toHaveBeenCalledWith('/test', expect.objectContaining({ method: 'POST' }));
    });
  });

  describe('put', () => {
    it('makes PUT request', async () => {
      (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: 1 }) });
      await put('/test', { body: { a: 1 } });
      expect(fetch).toHaveBeenCalledWith('/test', expect.objectContaining({ method: 'PUT' }));
    });
  });

  describe('del', () => {
    it('makes DELETE request', async () => {
      (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      await del('/test');
      expect(fetch).toHaveBeenCalledWith('/test', expect.objectContaining({ method: 'DELETE' }));
    });
  });
});
