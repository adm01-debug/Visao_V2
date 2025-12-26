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
            { id: '1', name: 'Motion Detection', type: 'motion', enabled: true }
          ], 
          error: null 
        })),
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

describe('useRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', async () => {
    const { useRules } = await import('../useRules');
    const { result } = renderHook(() => useRules(), { wrapper: createWrapper() });

    expect(result.current.loading).toBeDefined();
  });

  it('should have CRUD functions', async () => {
    const { useRules } = await import('../useRules');
    const { result } = renderHook(() => useRules(), { wrapper: createWrapper() });

    expect(typeof result.current.createRule).toBe('function');
    expect(typeof result.current.updateRule).toBe('function');
    expect(typeof result.current.deleteRule).toBe('function');
  });

  it('should fetch rules', async () => {
    const { useRules } = await import('../useRules');
    const { result } = renderHook(() => useRules(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rules).toBeDefined();
  });

  it('should have toggle function', async () => {
    const { useRules } = await import('../useRules');
    const { result } = renderHook(() => useRules(), { wrapper: createWrapper() });

    expect(typeof result.current.toggleRule).toBe('function');
  });
});
