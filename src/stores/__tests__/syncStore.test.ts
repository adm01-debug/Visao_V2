import { describe, it, expect, beforeEach } from 'vitest';
import { useSyncStore } from '@/stores/syncStore';
import { act, renderHook } from '@testing-library/react';

describe('syncStore', () => {
  beforeEach(() => { useSyncStore.getState().reset(); });

  it('deve iniciar sync', () => {
    const { result } = renderHook(() => useSyncStore());
    act(() => { result.current.startSync(); });
    expect(result.current.isSyncing).toBe(true);
  });

  it('deve completar sync', () => {
    const { result } = renderHook(() => useSyncStore());
    act(() => { result.current.startSync(); });
    act(() => { result.current.completeSync(); });
    expect(result.current.isSyncing).toBe(false);
  });
});
