import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAsyncReducer } from '@/hooks/useAsyncReducer';

describe('useAsyncReducer', () => {
  const reducer = (state: any, action: any) => {
    switch (action.type) {
      case 'INCREMENT': return { count: state.count + 1 };
      case 'SET': return { count: action.payload };
      default: return state;
    }
  };

  it('deve inicializar com estado inicial', () => {
    const { result } = renderHook(() => useAsyncReducer(reducer, { count: 0 }));
    expect(result.current[0]).toEqual({ count: 0 });
  });

  it('deve despachar ações síncronas', () => {
    const { result } = renderHook(() => useAsyncReducer(reducer, { count: 0 }));
    act(() => { result.current[1]({ type: 'INCREMENT' }); });
    expect(result.current[0].count).toBe(1);
  });

  it('deve despachar ações assíncronas', async () => {
    const { result } = renderHook(() => useAsyncReducer(reducer, { count: 0 }));
    const asyncAction = async () => ({ type: 'SET', payload: 10 });
    await act(async () => { await result.current[1](asyncAction()); });
    expect(result.current[0].count).toBe(10);
  });

  it('deve indicar estado de loading', async () => {
    const { result } = renderHook(() => useAsyncReducer(reducer, { count: 0 }));
    expect(result.current[2]).toBe(false);
  });
});
