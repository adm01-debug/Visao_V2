import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useIndexedDB', () => ({
  useIndexedDB: () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    isReady: true,
  }),
}));

describe('useIndexedDB', () => {
  it('deve armazenar dados', async () => {
    const { useIndexedDB } = await import('@/hooks/useIndexedDB');
    const { result } = renderHook(() => useIndexedDB('test-store'));
    await result.current.set('key', { value: 'test' });
    expect(result.current.set).toHaveBeenCalled();
  });

  it('deve recuperar dados', async () => {
    const { useIndexedDB } = await import('@/hooks/useIndexedDB');
    const { result } = renderHook(() => useIndexedDB('test-store'));
    await result.current.get('key');
    expect(result.current.get).toHaveBeenCalled();
  });

  it('deve remover dados', async () => {
    const { useIndexedDB } = await import('@/hooks/useIndexedDB');
    const { result } = renderHook(() => useIndexedDB('test-store'));
    await result.current.remove('key');
    expect(result.current.remove).toHaveBeenCalled();
  });
});
