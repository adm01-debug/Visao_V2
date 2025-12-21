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
            { id: '1', name: 'Camera 1', location: 'Entrance', status: 'online', stream_url: 'rtsp://test' }
          ], 
          error: null 
        })),
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
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

describe('useCameras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', async () => {
    const { useCameras } = await import('../useCameras');
    const { result } = renderHook(() => useCameras(), { wrapper: createWrapper() });

    expect(result.current.loading).toBeDefined();
  });

  it('should have CRUD functions', async () => {
    const { useCameras } = await import('../useCameras');
    const { result } = renderHook(() => useCameras(), { wrapper: createWrapper() });

    expect(typeof result.current.createCamera).toBe('function');
    expect(typeof result.current.updateCamera).toBe('function');
    expect(typeof result.current.deleteCamera).toBe('function');
  });

  it('should fetch cameras', async () => {
    const { useCameras } = await import('../useCameras');
    const { result } = renderHook(() => useCameras(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cameras).toBeDefined();
  });

  it('should have refresh function', async () => {
    const { useCameras } = await import('../useCameras');
    const { result } = renderHook(() => useCameras(), { wrapper: createWrapper() });

    expect(typeof result.current.refetch).toBe('function');
  });
});
