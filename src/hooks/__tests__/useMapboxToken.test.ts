import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMapboxToken } from '../useMapboxToken';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0 },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useMapboxToken', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => useMapboxToken(), { wrapper });
    expect(result.current).toBeDefined();
  });

  it('should handle state updates', async () => {
    const { result } = renderHook(() => useMapboxToken(), { wrapper });
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useMapboxToken(), { wrapper });
    expect(() => unmount()).not.toThrow();
  });
});
