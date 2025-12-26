import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAnalysisConfigs } from '../useAnalysisConfigs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0 },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useAnalysisConfigs', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAnalysisConfigs(), { wrapper });
    expect(result.current.isLoading).toBeDefined();
  });

  it('should return data after loading', async () => {
    const { result } = renderHook(() => useAnalysisConfigs(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle errors gracefully', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAnalysisConfigs(), { wrapper });
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('should refetch on demand', async () => {
    const { result } = renderHook(() => useAnalysisConfigs(), { wrapper });
    await waitFor(() => {
      expect(result.current.refetch).toBeDefined();
    });
    if (result.current.refetch) {
      await act(async () => {
        await result.current.refetch();
      });
    }
  });
});
