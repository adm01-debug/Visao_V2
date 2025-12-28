import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLongPress } from '@/hooks/useLongPress';

describe('useLongPress', () => {
  it('deve detectar long press', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, { delay: 500 }));
    
    act(() => { result.current.onMouseDown({} as any); });
    act(() => { vi.advanceTimersByTime(600); });
    
    expect(onLongPress).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('deve cancelar se soltar antes do delay', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, { delay: 500 }));
    
    act(() => { result.current.onMouseDown({} as any); });
    act(() => { vi.advanceTimersByTime(200); });
    act(() => { result.current.onMouseUp(); });
    act(() => { vi.advanceTimersByTime(400); });
    
    expect(onLongPress).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
