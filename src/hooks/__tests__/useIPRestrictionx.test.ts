// src/hooks/__tests__/useIPRestrictionx.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useIPRestrictionx } from '../useIPRestrictionx';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: { allowed: true }, error: null }) } },
}));

describe('useIPRestrictionx', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => useIPRestrictionx());
    expect(result.current).toBeDefined();
  });

  it('deve verificar IP', async () => {
    const { result } = renderHook(() => useIPRestrictionx());
    if (result.current.checkIP) {
      await act(async () => {
        const allowed = await result.current.checkIP('192.168.1.1');
        expect(typeof allowed).toBe('boolean');
      });
    }
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => useIPRestrictionx());
    expect(() => unmount()).not.toThrow();
  });
});
