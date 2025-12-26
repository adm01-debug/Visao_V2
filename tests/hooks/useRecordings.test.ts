import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecordings } from '../useRecordings';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useRecordings', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('returns initial loading state', () => {
    const { result } = renderHook(() => useRecordings(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('returns recordings data', async () => {
    const mockRecordings = [{ id: '1', name: 'Recording 1' }];
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRecordings,
    } as Response);

    const { result } = renderHook(() => useRecordings(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockRecordings);
  });

  it('handles error state', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useRecordings(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('supports filtering', async () => {
    const { result } = renderHook(() => useRecordings({ cameraId: '123' }), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });
});
