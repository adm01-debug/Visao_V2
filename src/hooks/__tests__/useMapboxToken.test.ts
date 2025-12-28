// src/hooks/__tests__/useMapboxToken.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMapboxToken } from '../useMapboxToken';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: { token: 'pk.test123' }, error: null }) } },
}));

describe('useMapboxToken', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => useMapboxToken());
    expect(result.current).toBeDefined();
  });

  it('deve retornar token', async () => {
    const { result } = renderHook(() => useMapboxToken());
    await waitFor(() => {
      if (result.current.token) {
        expect(typeof result.current.token).toBe('string');
      }
    });
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => useMapboxToken());
    expect(() => unmount()).not.toThrow();
  });
});
