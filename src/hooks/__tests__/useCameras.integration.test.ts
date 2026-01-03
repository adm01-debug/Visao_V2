/**
 * VISÃO - Testes de Integração: useCameras hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createMockSupabaseClient } from '@/test/mocks/supabase';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com' },
    loading: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/data/mockData', () => ({
  mockCameras: [
    { name: 'Cam 1', location: 'Loc 1', status: 'online', detectedPeople: 0, alerts: 0 },
  ],
}));

import { useCameras } from '@/hooks/useCameras';

describe('useCameras hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com estado correto', () => {
    const { result } = renderHook(() => useCameras());
    
    expect(result.current.cameras).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('deve ter função fetchCameras', () => {
    const { result } = renderHook(() => useCameras());
    expect(typeof result.current.fetchCameras).toBe('function');
  });

  it('deve ter função createCamera', () => {
    const { result } = renderHook(() => useCameras());
    expect(typeof result.current.createCamera).toBe('function');
  });

  it('deve ter função updateCamera', () => {
    const { result } = renderHook(() => useCameras());
    expect(typeof result.current.updateCamera).toBe('function');
  });

  it('deve ter função deleteCamera', () => {
    const { result } = renderHook(() => useCameras());
    expect(typeof result.current.deleteCamera).toBe('function');
  });

  it('deve ter função refetch', () => {
    const { result } = renderHook(() => useCameras());
    expect(typeof result.current.refetch).toBe('function');
  });
});
