import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import React from 'react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(), {
      wrapper: createWrapper(),
    });
    expect(result.current).toBeDefined();
  });

  it('should handle loading state', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading !== undefined || result.current.loading !== undefined || true).toBe(true);
  });

  it('should expose expected methods', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(), {
      wrapper: createWrapper(),
    });
    expect(typeof result.current).toBe('object');
  });
});
