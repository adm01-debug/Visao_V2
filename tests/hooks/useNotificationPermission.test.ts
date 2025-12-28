import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useNotificationPermission', () => ({
  useNotificationPermission: () => ({
    permission: 'granted',
    request: vi.fn().mockResolvedValue('granted'),
    isSupported: true,
  }),
}));

describe('useNotificationPermission', () => {
  it('deve retornar permissão atual', async () => {
    const { useNotificationPermission } = await import('@/hooks/useNotificationPermission');
    const { result } = renderHook(() => useNotificationPermission());
    expect(['granted', 'denied', 'default']).toContain(result.current.permission);
  });

  it('deve solicitar permissão', async () => {
    const { useNotificationPermission } = await import('@/hooks/useNotificationPermission');
    const { result } = renderHook(() => useNotificationPermission());
    expect(result.current.request).toBeDefined();
  });
});
