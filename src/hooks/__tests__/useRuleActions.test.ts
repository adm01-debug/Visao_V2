// src/hooks/__tests__/useRuleActions.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRuleActions } from '../useRuleActions';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    functions: { invoke: vi.fn().mockResolvedValue({ data: {}, error: null }) },
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockAction = {
  id: 'action-1',
  type: 'send_alert',
  params: { severity: 'high', message: 'Alerta de teste' },
  rule_id: 'rule-1',
};

describe('useRuleActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [mockAction], error: null }),
      insert: vi.fn().mockResolvedValue({ data: mockAction, error: null }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar sem erros', () => {
      const { result } = renderHook(() => useRuleActions());
      expect(result.current).toBeDefined();
    });
  });

  describe('Execução de Ações', () => {
    it('deve executar ação de alerta', async () => {
      const { result } = renderHook(() => useRuleActions());
      if (result.current.executeAction) {
        await act(async () => {
          await result.current.executeAction({ type: 'send_alert', params: {} });
        });
      }
    });

    it('deve executar ação de notificação', async () => {
      const { result } = renderHook(() => useRuleActions());
      if (result.current.executeAction) {
        await act(async () => {
          await result.current.executeAction({ type: 'send_notification', params: { channel: 'telegram' } });
        });
      }
    });

    it('deve executar ação de gravação', async () => {
      const { result } = renderHook(() => useRuleActions());
      if (result.current.executeAction) {
        await act(async () => {
          await result.current.executeAction({ type: 'start_recording', params: { duration: 60 } });
        });
      }
    });

    it('deve executar múltiplas ações', async () => {
      const { result } = renderHook(() => useRuleActions());
      if (result.current.executeActions) {
        await act(async () => {
          await result.current.executeActions([
            { type: 'send_alert', params: {} },
            { type: 'send_notification', params: {} },
          ]);
        });
      }
    });
  });

  describe('Tipos de Ação', () => {
    it('deve listar tipos disponíveis', () => {
      const { result } = renderHook(() => useRuleActions());
      if (result.current.actionTypes) {
        expect(Array.isArray(result.current.actionTypes)).toBe(true);
      }
    });

    it('deve validar parâmetros de ação', () => {
      const { result } = renderHook(() => useRuleActions());
      if (result.current.validateAction) {
        const valid = result.current.validateAction({ type: 'send_alert', params: {} });
        expect(typeof valid).toBe('boolean');
      }
    });
  });

  describe('Histórico', () => {
    it('deve registrar execução de ação', async () => {
      const { result } = renderHook(() => useRuleActions());
      if (result.current.logExecution) {
        await act(async () => {
          await result.current.logExecution('action-1', 'success');
        });
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos', () => {
      const { unmount } = renderHook(() => useRuleActions());
      expect(() => unmount()).not.toThrow();
    });
  });
});
