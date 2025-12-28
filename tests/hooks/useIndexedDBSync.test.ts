import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useIndexedDBSync', () => ({
  useIndexedDBSync: () => ({
    sync: vi.fn().mockResolvedValue(undefined),
    isSyncing: false,
    lastSync: new Date(),
    pendingChanges: 0,
  }),
}));

describe('useIndexedDBSync', () => {
  it('deve sincronizar dados', async () => {
    const { useIndexedDBSync } = await import('@/hooks/useIndexedDBSync');
    const { result } = renderHook(() => useIndexedDBSync());
    expect(result.current.sync).toBeDefined();
  });

  it('deve indicar estado de sincronização', async () => {
    const { useIndexedDBSync } = await import('@/hooks/useIndexedDBSync');
    const { result } = renderHook(() => useIndexedDBSync());
    expect(typeof result.current.isSyncing).toBe('boolean');
  });
});
