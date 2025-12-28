import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';

describe('useNotificationPermission', () => {
  it('deve retornar permissão atual', () => {
    const { result } = renderHook(() => useNotificationPermission());
    expect(result.current.permission).toBeDefined();
  });

  it('deve solicitar permissão', async () => {
    Notification.requestPermission = vi.fn().mockResolvedValue('granted');
    const { result } = renderHook(() => useNotificationPermission());
    await act(async () => { await result.current.requestPermission(); });
    expect(result.current.permission).toBe('granted');
  });

  it('deve verificar suporte', () => {
    const { result } = renderHook(() => useNotificationPermission());
    expect(result.current.isSupported).toBeDefined();
  });
});
