import { describe, it, expect, beforeEach } from 'vitest';
import { useOfflineStore } from '@/stores/offlineStore';
import { act, renderHook } from '@testing-library/react';

describe('offlineStore', () => {
  beforeEach(() => { useOfflineStore.getState().reset(); });

  it('deve detectar offline', () => {
    const { result } = renderHook(() => useOfflineStore());
    act(() => { result.current.setOnline(false); });
    expect(result.current.isOnline).toBe(false);
  });

  it('deve enfileirar ação', () => {
    const { result } = renderHook(() => useOfflineStore());
    act(() => { result.current.queueAction({ type: 'CREATE', data: {} }); });
    expect(result.current.pendingActions).toHaveLength(1);
  });
});
