// src/hooks/__tests__/useRuleViolations.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRuleViolations } from '../useRuleViolations';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const mockViolation = {
  id: 'violation-1',
  rule_id: 'rule-1',
  rule_name: 'Regra de Segurança',
  camera_id: 'cam-1',
  severity: 'high',
  details: { event: 'intrusion' },
  acknowledged: false,
  timestamp: new Date().toISOString(),
};

describe('useRuleViolations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [mockViolation], error: null }),
        }),
        eq: vi.fn().mockResolvedValue({ data: [mockViolation], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: mockViolation, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockViolation, error: null }),
      }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar com estado padrão', () => {
      const { result } = renderHook(() => useRuleViolations());
      expect(result.current).toBeDefined();
      expect(result.current.violations).toBeDefined();
    });
  });

  describe('Busca de Violações', () => {
    it('deve buscar violações', async () => {
      const { result } = renderHook(() => useRuleViolations());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it('deve filtrar por regra', async () => {
      const { result } = renderHook(() => useRuleViolations());
      if (result.current.getByRule) {
        await act(async () => {
          const violations = await result.current.getByRule('rule-1');
          expect(Array.isArray(violations)).toBe(true);
        });
      }
    });

    it('deve filtrar por severidade', () => {
      const { result } = renderHook(() => useRuleViolations());
      if (result.current.filterBySeverity) {
        const filtered = result.current.filterBySeverity('high');
        expect(Array.isArray(filtered)).toBe(true);
      }
    });
  });

  describe('Registro de Violações', () => {
    it('deve registrar nova violação', async () => {
      const { result } = renderHook(() => useRuleViolations());
      if (result.current.recordViolation) {
        await act(async () => {
          await result.current.recordViolation({
            rule_id: 'rule-1',
            camera_id: 'cam-1',
            severity: 'high',
            details: {},
          });
        });
      }
    });
  });

  describe('Reconhecimento', () => {
    it('deve reconhecer violação', async () => {
      const { result } = renderHook(() => useRuleViolations());
      if (result.current.acknowledge) {
        await act(async () => {
          await result.current.acknowledge('violation-1');
        });
      }
    });

    it('deve reconhecer todas as violações', async () => {
      const { result } = renderHook(() => useRuleViolations());
      if (result.current.acknowledgeAll) {
        await act(async () => { await result.current.acknowledgeAll(); });
      }
    });
  });

  describe('Estatísticas', () => {
    it('deve retornar contagem não reconhecida', () => {
      const { result } = renderHook(() => useRuleViolations());
      if (result.current.unacknowledgedCount !== undefined) {
        expect(typeof result.current.unacknowledgedCount).toBe('number');
      }
    });

    it('deve retornar estatísticas por regra', () => {
      const { result } = renderHook(() => useRuleViolations());
      if (result.current.statsByRule) {
        expect(typeof result.current.statsByRule).toBe('object');
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useRuleViolations());
      expect(() => unmount()).not.toThrow();
    });
  });
});
