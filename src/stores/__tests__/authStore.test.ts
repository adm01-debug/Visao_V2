import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import { act, renderHook } from '@testing-library/react';

describe('authStore', () => {
  beforeEach(() => { useAuthStore.getState().logout(); });

  it('deve iniciar não autenticado', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('deve fazer login', () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => { result.current.login({ id: '1', email: 'test@test.com' }); });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('deve fazer logout', () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => { result.current.login({ id: '1', email: 'test@test.com' }); });
    act(() => { result.current.logout(); });
    expect(result.current.isAuthenticated).toBe(false);
  });
});
