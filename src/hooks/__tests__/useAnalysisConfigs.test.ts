import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAnalysisConfigs } from '../useAnalysisConfigs';
import React from 'react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAnalysisConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useAnalysisConfigs(), {
      wrapper: createWrapper(),
    });
    expect(result.current.configs).toBeDefined();
    expect(result.current.isLoading).toBeDefined();
  });

  it('should handle loading state', () => {
    const { result } = renderHook(() => useAnalysisConfigs(), {
      wrapper: createWrapper(),
    });
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('should have create function', () => {
    const { result } = renderHook(() => useAnalysisConfigs(), {
      wrapper: createWrapper(),
    });
    expect(typeof result.current.createConfig).toBe('function');
  });
});
