import { describe, it, expect, beforeEach } from 'vitest';
import { useQueueStore } from '@/stores/queueStore';
import { act, renderHook } from '@testing-library/react';

describe('queueStore', () => {
  beforeEach(() => { useQueueStore.getState().reset(); });

  it('deve adicionar à fila', () => {
    const { result } = renderHook(() => useQueueStore());
    act(() => { result.current.enqueue({ id: '1', type: 'process' }); });
    expect(result.current.queue).toHaveLength(1);
  });

  it('deve processar fila', () => {
    const { result } = renderHook(() => useQueueStore());
    act(() => { result.current.enqueue({ id: '1', type: 'process' }); });
    act(() => { result.current.dequeue(); });
    expect(result.current.queue).toHaveLength(0);
  });
});
