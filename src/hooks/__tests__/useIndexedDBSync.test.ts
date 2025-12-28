import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useIndexedDBSync } from '@/hooks/useIndexedDBSync';

describe('useIndexedDBSync', () => {
  it('deve sincronizar dados', async () => {
    const { result } = renderHook(() => useIndexedDBSync('syncDB'));
    expect(result.current.isSyncing).toBe(false);
  });

  it('deve retornar status de sync', () => {
    const { result } = renderHook(() => useIndexedDBSync('syncDB'));
    expect(result.current.lastSync).toBeDefined();
  });

  it('deve forçar sync', async () => {
    const { result } = renderHook(() => useIndexedDBSync('syncDB'));
    await act(async () => { await result.current.forceSync(); });
  });
});
