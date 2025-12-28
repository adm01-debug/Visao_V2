import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useReducerWithMiddleware } from '@/hooks/useReducerWithMiddleware';

describe('useReducerWithMiddleware', () => {
  const reducer = (state: number, action: any) => action.type === 'INC' ? state + 1 : state;
  const logger = vi.fn();

  it('deve aplicar middleware', () => {
    const { result } = renderHook(() => useReducerWithMiddleware(reducer, 0, [logger]));
    act(() => { result.current[1]({ type: 'INC' }); });
    expect(logger).toHaveBeenCalled();
  });

  it('deve atualizar estado', () => {
    const { result } = renderHook(() => useReducerWithMiddleware(reducer, 0, []));
    act(() => { result.current[1]({ type: 'INC' }); });
    expect(result.current[0]).toBe(1);
  });
});
