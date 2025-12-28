import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useApi } from '@/hooks/useApi';

global.fetch = vi.fn();

describe('useApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches data successfully', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: 'test' }) });
    const { result } = renderHook(() => useApi('/api/test'));
    await waitFor(() => expect(result.current.data).toEqual({ data: 'test' }));
  });

  it('handles loading state', async () => {
    (fetch as any).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useApi('/api/test'));
    expect(result.current.loading).toBe(true);
  });

  it('handles error', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Failed'));
    const { result } = renderHook(() => useApi('/api/test'));
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('supports custom options', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    renderHook(() => useApi('/api/test', { method: 'POST' }));
    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({ method: 'POST' }));
  });
});
