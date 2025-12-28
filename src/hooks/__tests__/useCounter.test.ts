import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCounter } from '@/hooks/useCounter';

describe('useCounter', () => {
  it('deve inicializar com valor padrão', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('deve inicializar com valor específico', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('deve incrementar', () => {
    const { result } = renderHook(() => useCounter());
    act(() => { result.current.increment(); });
    expect(result.current.count).toBe(1);
  });

  it('deve decrementar', () => {
    const { result } = renderHook(() => useCounter(5));
    act(() => { result.current.decrement(); });
    expect(result.current.count).toBe(4);
  });

  it('deve resetar', () => {
    const { result } = renderHook(() => useCounter(5));
    act(() => { result.current.increment(); });
    act(() => { result.current.reset(); });
    expect(result.current.count).toBe(5);
  });

  it('deve setar valor específico', () => {
    const { result } = renderHook(() => useCounter());
    act(() => { result.current.set(100); });
    expect(result.current.count).toBe(100);
  });
});
