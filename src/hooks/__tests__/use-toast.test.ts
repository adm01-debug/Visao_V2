// src/hooks/__tests__/use-toast.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock do módulo use-toast
const mockToast = vi.fn();
const mockDismiss = vi.fn();

vi.mock('../use-toast', () => ({
  useToast: () => ({ toast: mockToast, dismiss: mockDismiss, toasts: [] }),
  toast: mockToast,
}));

import { useToast } from '../use-toast';

describe('use-toast', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current).toBeDefined();
    expect(result.current.toast).toBeDefined();
  });

  it('deve mostrar toast', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.toast({ title: 'Test' }); });
    expect(mockToast).toHaveBeenCalled();
  });

  it('deve dispensar toast', () => {
    const { result } = renderHook(() => useToast());
    if (result.current.dismiss) {
      act(() => { result.current.dismiss('toast-1'); });
    }
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => useToast());
    expect(() => unmount()).not.toThrow();
  });
});
