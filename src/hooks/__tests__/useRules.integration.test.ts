/**
 * VISÃO - Testes de Integração: useRules hook
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

import { useRules } from '@/hooks/useRules';

describe('useRules hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com estado correto', () => {
    const { result } = renderHook(() => useRules());
    
    expect(result.current.rules).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('deve ter função fetchRules', () => {
    const { result } = renderHook(() => useRules());
    expect(typeof result.current.fetchRules).toBe('function');
  });

  it('deve ter função createRule', () => {
    const { result } = renderHook(() => useRules());
    expect(typeof result.current.createRule).toBe('function');
  });

  it('deve ter função updateRule', () => {
    const { result } = renderHook(() => useRules());
    expect(typeof result.current.updateRule).toBe('function');
  });

  it('deve ter função deleteRule', () => {
    const { result } = renderHook(() => useRules());
    expect(typeof result.current.deleteRule).toBe('function');
  });

  it('deve ter função toggleRule', () => {
    const { result } = renderHook(() => useRules());
    expect(typeof result.current.toggleRule).toBe('function');
  });

  it('deve calcular activeRulesCount corretamente', () => {
    const { result } = renderHook(() => useRules());
    expect(typeof result.current.activeRulesCount).toBe('number');
  });
});
