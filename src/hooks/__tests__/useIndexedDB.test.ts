import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useIndexedDB } from '@/hooks/useIndexedDB';

describe('useIndexedDB', () => {
  it('deve verificar suporte', () => {
    const { result } = renderHook(() => useIndexedDB('testDB'));
    expect(result.current.isSupported).toBe(true);
  });

  it('deve adicionar item', async () => {
    const { result } = renderHook(() => useIndexedDB('testDB'));
    await act(async () => { await result.current.add('store', { id: 1, name: 'test' }); });
  });

  it('deve obter item', async () => {
    const { result } = renderHook(() => useIndexedDB('testDB'));
    await act(async () => { await result.current.get('store', 1); });
  });

  it('deve deletar item', async () => {
    const { result } = renderHook(() => useIndexedDB('testDB'));
    await act(async () => { await result.current.delete('store', 1); });
  });
});
