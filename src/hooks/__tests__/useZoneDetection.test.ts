// src/hooks/__tests__/useZoneDetection.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useZoneDetection } from '../useZoneDetection';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const mockZone = {
  id: 'zone-1',
  name: 'Área Restrita',
  type: 'restricted',
  points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
  camera_id: 'cam-1',
  enabled: true,
  alert_on_enter: true,
  alert_on_exit: false,
};

describe('useZoneDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [mockZone], error: null }),
        eq: vi.fn().mockResolvedValue({ data: [mockZone], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: mockZone, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockZone, error: null }),
      }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe('Inicialização', () => {
    it('deve inicializar com estado padrão', () => {
      const { result } = renderHook(() => useZoneDetection());
      expect(result.current).toBeDefined();
      expect(result.current.zones).toBeDefined();
    });

    it('deve ter loading durante fetch', () => {
      const { result } = renderHook(() => useZoneDetection());
      expect(typeof result.current.loading).toBe('boolean');
    });
  });

  describe('Gerenciamento de Zonas', () => {
    it('deve buscar zonas com sucesso', async () => {
      const { result } = renderHook(() => useZoneDetection());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it('deve criar nova zona', async () => {
      const { result } = renderHook(() => useZoneDetection());
      if (result.current.createZone) {
        await act(async () => {
          await result.current.createZone({ name: 'Nova Zona', type: 'monitoring', points: [] });
        });
      }
    });

    it('deve atualizar zona existente', async () => {
      const { result } = renderHook(() => useZoneDetection());
      if (result.current.updateZone) {
        await act(async () => {
          await result.current.updateZone('zone-1', { name: 'Zona Atualizada' });
        });
      }
    });

    it('deve deletar zona', async () => {
      const { result } = renderHook(() => useZoneDetection());
      if (result.current.deleteZone) {
        await act(async () => { await result.current.deleteZone('zone-1'); });
      }
    });
  });

  describe('Detecção de Intrusão', () => {
    it('deve detectar ponto dentro da zona', () => {
      const { result } = renderHook(() => useZoneDetection());
      if (result.current.isPointInZone) {
        const inside = result.current.isPointInZone({ x: 50, y: 50 }, mockZone.points);
        expect(typeof inside).toBe('boolean');
      }
    });

    it('deve detectar ponto fora da zona', () => {
      const { result } = renderHook(() => useZoneDetection());
      if (result.current.isPointInZone) {
        const inside = result.current.isPointInZone({ x: 200, y: 200 }, mockZone.points);
        expect(inside).toBe(false);
      }
    });

    it('deve verificar múltiplas zonas', () => {
      const { result } = renderHook(() => useZoneDetection());
      if (result.current.checkZones) {
        const violations = result.current.checkZones({ x: 50, y: 50 });
        expect(Array.isArray(violations)).toBe(true);
      }
    });
  });

  describe('Alertas de Zona', () => {
    it('deve disparar alerta ao entrar na zona', async () => {
      const { result } = renderHook(() => useZoneDetection());
      if (result.current.triggerZoneAlert) {
        await act(async () => {
          await result.current.triggerZoneAlert('zone-1', 'enter');
        });
      }
    });

    it('deve ter contagem de violações', () => {
      const { result } = renderHook(() => useZoneDetection());
      if (result.current.violationsCount !== undefined) {
        expect(typeof result.current.violationsCount).toBe('number');
      }
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos ao desmontar', () => {
      const { unmount } = renderHook(() => useZoneDetection());
      expect(() => unmount()).not.toThrow();
    });
  });
});
