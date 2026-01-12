import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFetch } from '../useFetch';

describe('useFetch', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch data on mount when immediate is true', async () => {
    const { result } = renderHook(() => useFetch('/api/test'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({ data: 'test' });
    expect(result.current.error).toBeNull();
  });

  it('should not fetch on mount when immediate is false', () => {
    const { result } = renderHook(() =>
      useFetch('/api/test', { immediate: false })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('should handle errors', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useFetch('/api/test'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toBeNull();
  });
});
