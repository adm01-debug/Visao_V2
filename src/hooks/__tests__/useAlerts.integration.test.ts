/**
 * VISÃO - Testes de Integração: useAlerts hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
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

vi.mock('@/hooks/useRealtimeAlerts', () => ({
  useRealtimeAlerts: vi.fn(),
}));

vi.mock('@/data/mockData', () => ({
  mockAlerts: [
    { 
      cameraName: 'Cam 1', 
      type: 'security', 
      severity: 'high', 
      message: 'Alert',
      timestamp: new Date(),
      isRead: false,
    },
  ],
}));

import { useAlerts } from '@/hooks/useAlerts';

describe('useAlerts hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com estado correto', () => {
    const { result } = renderHook(() => useAlerts());
    
    expect(result.current.alerts).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('deve ter função fetchAlerts', () => {
    const { result } = renderHook(() => useAlerts());
    expect(typeof result.current.fetchAlerts).toBe('function');
  });

  it('deve ter função createAlert', () => {
    const { result } = renderHook(() => useAlerts());
    expect(typeof result.current.createAlert).toBe('function');
  });

  it('deve ter função markAsRead', () => {
    const { result } = renderHook(() => useAlerts());
    expect(typeof result.current.markAsRead).toBe('function');
  });

  it('deve ter função markAllAsRead', () => {
    const { result } = renderHook(() => useAlerts());
    expect(typeof result.current.markAllAsRead).toBe('function');
  });

  it('deve ter função deleteAlert', () => {
    const { result } = renderHook(() => useAlerts());
    expect(typeof result.current.deleteAlert).toBe('function');
  });

  it('deve calcular unreadCount corretamente', () => {
    const { result } = renderHook(() => useAlerts());
    expect(typeof result.current.unreadCount).toBe('number');
    expect(result.current.unreadCount).toBe(0);
  });
});
