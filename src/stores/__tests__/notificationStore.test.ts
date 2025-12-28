import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from '@/stores/notificationStore';
import { act, renderHook } from '@testing-library/react';

describe('notificationStore', () => {
  beforeEach(() => { useNotificationStore.getState().reset(); });

  it('deve adicionar notificação', () => {
    const { result } = renderHook(() => useNotificationStore());
    act(() => { result.current.add({ id: '1', message: 'Test', type: 'info' }); });
    expect(result.current.notifications).toHaveLength(1);
  });

  it('deve remover notificação', () => {
    const { result } = renderHook(() => useNotificationStore());
    act(() => { result.current.add({ id: '1', message: 'Test' }); });
    act(() => { result.current.remove('1'); });
    expect(result.current.notifications).toHaveLength(0);
  });
});
