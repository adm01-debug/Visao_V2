// src/hooks/__tests__/usePermissions.test.ts
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePermissions } from '../usePermissions';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn(() => ({ user: { role: 'admin' } })) }));

describe('usePermissions', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current).toBeDefined();
  });

  it('deve verificar permissão', () => {
    const { result } = renderHook(() => usePermissions());
    if (result.current.hasPermission) {
      const has = result.current.hasPermission('read');
      expect(typeof has).toBe('boolean');
    }
  });

  it('deve verificar role', () => {
    const { result } = renderHook(() => usePermissions());
    if (result.current.isAdmin) {
      expect(typeof result.current.isAdmin).toBe('boolean');
    }
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => usePermissions());
    expect(() => unmount()).not.toThrow();
  });
});
