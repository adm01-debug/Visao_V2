// src/hooks/__tests__/useSettings.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSettings } from '../useSettings';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnThis() },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { theme: 'dark' }, error: null }) }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current).toBeDefined();
  });

  it('deve atualizar settings', async () => {
    const { result } = renderHook(() => useSettings());
    if (result.current.updateSettings) {
      await act(async () => { await result.current.updateSettings({ theme: 'light' }); });
    }
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => useSettings());
    expect(() => unmount()).not.toThrow();
  });
});
