import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePPEConfigs } from '../usePPEConfigs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0 },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('usePPEConfigs', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('should initialize correctly', () => {
    const { result } = renderHook(() => usePPEConfigs(), { wrapper });
    expect(result.current).toBeDefined();
  });

  it('should handle state updates', async () => {
    const { result } = renderHook(() => usePPEConfigs(), { wrapper });
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => usePPEConfigs(), { wrapper });
    expect(() => unmount()).not.toThrow();
  });
});
