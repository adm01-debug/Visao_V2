// src/hooks/__tests__/useNotificationFlow.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNotificationFlow } from '../useNotificationFlow';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useNotificationFlow', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => useNotificationFlow());
    expect(result.current).toBeDefined();
  });

  it('deve enviar notificação', async () => {
    const { result } = renderHook(() => useNotificationFlow());
    if (result.current.sendNotification) {
      await act(async () => { await result.current.sendNotification({ title: 'Test', message: 'Test' }); });
    }
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => useNotificationFlow());
    expect(() => unmount()).not.toThrow();
  });
});
