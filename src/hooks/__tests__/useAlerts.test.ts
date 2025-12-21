import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ 
          data: [
            { id: '1', title: 'Test Alert', severity: 'high', created_at: new Date().toISOString() }
          ], 
          error: null 
        })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: { id: '2' }, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', async () => {
    const { useAlerts } = await import('../useAlerts');
    const { result } = renderHook(() => useAlerts(), { wrapper: createWrapper() });

    expect(result.current.loading).toBeDefined();
  });

  it('should have CRUD functions', async () => {
    const { useAlerts } = await import('../useAlerts');
    const { result } = renderHook(() => useAlerts(), { wrapper: createWrapper() });

    expect(typeof result.current.createAlert).toBe('function');
    expect(typeof result.current.updateAlert).toBe('function');
    expect(typeof result.current.deleteAlert).toBe('function');
  });

  it('should fetch alerts', async () => {
    const { useAlerts } = await import('../useAlerts');
    const { result } = renderHook(() => useAlerts(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.alerts).toBeDefined();
  });

  it('should have acknowledge function', async () => {
    const { useAlerts } = await import('../useAlerts');
    const { result } = renderHook(() => useAlerts(), { wrapper: createWrapper() });

    expect(typeof result.current.acknowledgeAlert).toBe('function');
  });
});
