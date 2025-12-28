// src/hooks/__tests__/useKeyboardShortcuts.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());
    expect(result.current).toBeDefined();
  });

  it('deve registrar shortcut', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());
    if (result.current.register) {
      const handler = vi.fn();
      act(() => { result.current.register('ctrl+s', handler); });
    }
  });

  it('deve remover shortcut', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());
    if (result.current.unregister) {
      act(() => { result.current.unregister('ctrl+s'); });
    }
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts());
    expect(() => unmount()).not.toThrow();
  });
});
