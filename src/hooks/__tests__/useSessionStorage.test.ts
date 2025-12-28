import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStorage } from '@/hooks/useSessionStorage';

describe('useSessionStorage', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('deve retornar valor inicial', () => {
    const { result } = renderHook(() => useSessionStorage('key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('deve salvar valor', () => {
    const { result } = renderHook(() => useSessionStorage('key', ''));
    act(() => { result.current[1]('new value'); });
    expect(result.current[0]).toBe('new value');
  });

  it('deve persistir em sessionStorage', () => {
    const { result } = renderHook(() => useSessionStorage('key', ''));
    act(() => { result.current[1]('persisted'); });
    expect(sessionStorage.getItem('key')).toBe('"persisted"');
  });
});
