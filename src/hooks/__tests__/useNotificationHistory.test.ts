// src/hooks/__tests__/useNotificationHistory.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNotificationHistory } from '../useNotificationHistory';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis() },
}));

describe('useNotificationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) }) }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => useNotificationHistory());
    expect(result.current).toBeDefined();
  });

  it('deve buscar histórico', async () => {
    const { result } = renderHook(() => useNotificationHistory());
    await waitFor(() => expect(result.current.history).toBeDefined());
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => useNotificationHistory());
    expect(() => unmount()).not.toThrow();
  });
});
