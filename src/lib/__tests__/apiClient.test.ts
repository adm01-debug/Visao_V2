import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ApiClient from '../apiClient';

describe('ApiClient', () => {
  let client: ApiClient;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    client = new ApiClient({ baseURL: 'https://api.example.com' });
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => Promise.resolve({ data: 'test' }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should make GET request', async () => {
    await client.get('/endpoint');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/endpoint',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should make POST request with body', async () => {
    await client.post('/endpoint', { name: 'test' });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/endpoint',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      })
    );
  });

  it('should throw on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 404 } as Response);
    await expect(client.get('/notfound')).rejects.toThrow();
  });
});
