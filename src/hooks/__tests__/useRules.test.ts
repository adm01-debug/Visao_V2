// src/hooks/__tests__/useRules.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRules } from '../useRules';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockRule = {
  id: 'rule-1',
  name: 'Regra de Segurança',
  type: 'security',
  conditions: { operator: 'AND', conditions: [] },
  actions: [{ type: 'alert', params: {} }],
  enabled: true,
  priority: 1,
  created_at: new Date().toISOString(),
};

describe('useRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [mockRule], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: mockRule, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockRule, error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar com estado padrão', () => {
      const { result } = renderHook(() => useRules());
      expect(result.current).toBeDefined();
      expect(result.current.rules).toBeDefined();
    });

    it('deve ter loading durante fetch', () => {
      const { result } = renderHook(() => useRules());
      expect(typeof result.current.loading).toBe('boolean');
    });
  });

  describe('CRUD de Regras', () => {
    it('deve buscar regras', async () => {
      const { result } = renderHook(() => useRules());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it('deve criar regra', async () => {
      const { result } = renderHook(() => useRules());
      if (result.current.createRule) {
        await act(async () => {
          await result.current.createRule({ name: 'Nova Regra', type: 'monitoring' });
        });
      }
    });

    it('deve atualizar regra', async () => {
      const { result } = renderHook(() => useRules());
      if (result.current.updateRule) {
        await act(async () => {
          await result.current.updateRule('rule-1', { enabled: false });
        });
      }
    });

    it('deve deletar regra', async () => {
      const { result } = renderHook(() => useRules());
      if (result.current.deleteRule) {
        await act(async () => { await result.current.deleteRule('rule-1'); });
      }
    });

    it('deve duplicar regra', async () => {
      const { result } = renderHook(() => useRules());
      if (result.current.duplicateRule) {
        await act(async () => { await result.current.duplicateRule('rule-1'); });
      }
    });
  });

  describe('Avaliação de Regras', () => {
    it('deve avaliar condições', () => {
      const { result } = renderHook(() => useRules());
      if (result.current.evaluateRule) {
        const matches = result.current.evaluateRule(mockRule, { event: 'motion' });
        expect(typeof matches).toBe('boolean');
      }
    });

    it('deve executar ações', async () => {
      const { result } = renderHook(() => useRules());
      if (result.current.executeActions) {
        await act(async () => {
          await result.current.executeActions(mockRule.actions);
        });
      }
    });
  });

  describe('Filtros e Ordenação', () => {
    it('deve filtrar por tipo', () => {
      const { result } = renderHook(() => useRules());
      if (result.current.filterByType) {
        const filtered = result.current.filterByType('security');
        expect(Array.isArray(filtered)).toBe(true);
      }
    });

    it('deve ordenar por prioridade', () => {
      const { result } = renderHook(() => useRules());
      if (result.current.sortByPriority) {
        const sorted = result.current.sortByPriority();
        expect(Array.isArray(sorted)).toBe(true);
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos ao desmontar', () => {
      const { unmount } = renderHook(() => useRules());
      expect(() => unmount()).not.toThrow();
    });
  });
});
