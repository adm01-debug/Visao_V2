import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useVibration } from '@/hooks/useVibration';

describe('useVibration', () => {
  it('deve verificar suporte', () => {
    const { result } = renderHook(() => useVibration());
    expect(result.current.isSupported).toBeDefined();
  });

  it('deve vibrar', () => {
    navigator.vibrate = vi.fn();
    const { result } = renderHook(() => useVibration());
    act(() => { result.current.vibrate(100); });
    expect(navigator.vibrate).toHaveBeenCalledWith(100);
  });
});
