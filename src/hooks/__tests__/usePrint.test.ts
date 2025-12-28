import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePrint } from '@/hooks/usePrint';

describe('usePrint', () => {
  it('deve chamar window.print', () => {
    window.print = vi.fn();
    const { result } = renderHook(() => usePrint());
    act(() => { result.current.print(); });
    expect(window.print).toHaveBeenCalled();
  });
});
