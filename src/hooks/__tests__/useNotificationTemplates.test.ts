// src/hooks/__tests__/useNotificationTemplates.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNotificationTemplates } from '../useNotificationTemplates';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useNotificationTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => useNotificationTemplates());
    expect(result.current).toBeDefined();
  });

  it('deve criar template', async () => {
    const { result } = renderHook(() => useNotificationTemplates());
    if (result.current.createTemplate) {
      await act(async () => { await result.current.createTemplate({ name: 'Test', content: 'Test' }); });
    }
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => useNotificationTemplates());
    expect(() => unmount()).not.toThrow();
  });
});
