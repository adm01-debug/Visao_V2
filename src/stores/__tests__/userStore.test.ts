import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore } from '@/stores/userStore';
import { act, renderHook } from '@testing-library/react';

describe('userStore', () => {
  beforeEach(() => { useUserStore.getState().reset(); });

  it('deve definir usuário', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => { result.current.setUser({ id: '1', name: 'Test', email: 'test@test.com' }); });
    expect(result.current.user?.name).toBe('Test');
  });

  it('deve atualizar preferências', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => { result.current.updatePreferences({ language: 'pt-BR' }); });
    expect(result.current.preferences.language).toBe('pt-BR');
  });

  it('deve limpar usuário', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => { result.current.setUser({ id: '1', name: 'Test' }); });
    act(() => { result.current.clear(); });
    expect(result.current.user).toBeNull();
  });
});
