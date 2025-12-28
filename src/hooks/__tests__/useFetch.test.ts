import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFetch } from '@/hooks/useFetch';

global.fetch = vi.fn();

describe('useFetch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches data', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: 'test' }) });
    const { result } = renderHook(() => useFetch('/api/data'));
    await waitFor(() => expect(result.current.data).toEqual({ data: 'test' }));
  });

  it('handles loading', () => {
    (fetch as any).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useFetch('/api/data'));
    expect(result.current.isLoading).toBe(true);
  });

  it('handles error', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useFetch('/api/data'));
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('provides refetch function', () => {
    const { result } = renderHook(() => useFetch('/api/data'));
    expect(typeof result.current.refetch).toBe('function');
  });
});
