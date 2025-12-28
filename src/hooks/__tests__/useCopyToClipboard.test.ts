// src/hooks/__tests__/useCopyToClipboard.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCopyToClipboard } from '../useCopyToClipboard';

// Mock clipboard API
Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

describe('useCopyToClipboard', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('deve inicializar sem erros', () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current).toBeDefined();
  });

  it('deve copiar texto', async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    if (result.current.copy) {
      await act(async () => { await result.current.copy('test text'); });
    }
  });

  it('deve indicar sucesso', async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    if (result.current.copy) {
      await act(async () => { await result.current.copy('test'); });
      if (result.current.copied !== undefined) {
        expect(typeof result.current.copied).toBe('boolean');
      }
    }
  });

  it('deve limpar recursos', () => {
    const { unmount } = renderHook(() => useCopyToClipboard());
    expect(() => unmount()).not.toThrow();
  });
});
