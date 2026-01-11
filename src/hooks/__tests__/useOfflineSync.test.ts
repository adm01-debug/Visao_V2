import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineSync } from '../useOfflineSync';

describe('useOfflineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useOfflineSync());
    
    expect(result.current.isOnline).toBeDefined();
    expect(result.current.pendingChanges).toEqual([]);
    expect(result.current.isSyncing).toBe(false);
  });

  it('detects online status', async () => {
    const { result } = renderHook(() => useOfflineSync());
    
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    
    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });
  });

  it('detects offline status', async () => {
    const { result } = renderHook(() => useOfflineSync());
    
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    
    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });
  });

  it('queues changes when offline', async () => {
    const { result } = renderHook(() => useOfflineSync());
    
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    
    act(() => {
      result.current.queueChange({ type: 'update', data: { id: 1 } });
    });
    
    expect(result.current.pendingChanges).toHaveLength(1);
  });

  it('syncs when coming back online', async () => {
    const onSync = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfflineSync({ onSync }));
    
    act(() => {
      window.dispatchEvent(new Event('offline'));
      result.current.queueChange({ type: 'update', data: { id: 1 } });
    });
    
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    
    await waitFor(() => {
      expect(onSync).toHaveBeenCalled();
    });
  });
});
