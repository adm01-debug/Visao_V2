import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useErrorBoundary } from '@/hooks/useErrorBoundary';

describe('useErrorBoundary', () => {
  it('deve iniciar sem erro', () => {
    const { result } = renderHook(() => useErrorBoundary());
    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it('deve capturar erro', () => {
    const { result } = renderHook(() => useErrorBoundary());
    act(() => { result.current.setError(new Error('Test error')); });
    expect(result.current.hasError).toBe(true);
    expect(result.current.error?.message).toBe('Test error');
  });

  it('deve resetar erro', () => {
    const { result } = renderHook(() => useErrorBoundary());
    act(() => { result.current.setError(new Error('Test')); });
    act(() => { result.current.resetError(); });
    expect(result.current.hasError).toBe(false);
  });
});
