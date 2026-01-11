import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwipeNavigation } from '../useSwipeNavigation';

describe('useSwipeNavigation', () => {
  it('returns handlers', () => {
    const { result } = renderHook(() => useSwipeNavigation({ onSwipeLeft: vi.fn(), onSwipeRight: vi.fn() }));
    
    expect(result.current.handlers).toBeDefined();
    expect(result.current.handlers.onTouchStart).toBeDefined();
    expect(result.current.handlers.onTouchEnd).toBeDefined();
  });

  it('calls onSwipeLeft on left swipe', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() => useSwipeNavigation({ onSwipeLeft, onSwipeRight: vi.fn() }));
    
    act(() => {
      result.current.handlers.onTouchStart({ touches: [{ clientX: 200 }] } as any);
      result.current.handlers.onTouchEnd({ changedTouches: [{ clientX: 50 }] } as any);
    });
    
    expect(onSwipeLeft).toHaveBeenCalled();
  });

  it('calls onSwipeRight on right swipe', () => {
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipeNavigation({ onSwipeLeft: vi.fn(), onSwipeRight }));
    
    act(() => {
      result.current.handlers.onTouchStart({ touches: [{ clientX: 50 }] } as any);
      result.current.handlers.onTouchEnd({ changedTouches: [{ clientX: 200 }] } as any);
    });
    
    expect(onSwipeRight).toHaveBeenCalled();
  });

  it('respects threshold', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() => useSwipeNavigation({ onSwipeLeft, onSwipeRight: vi.fn(), threshold: 100 }));
    
    act(() => {
      result.current.handlers.onTouchStart({ touches: [{ clientX: 100 }] } as any);
      result.current.handlers.onTouchEnd({ changedTouches: [{ clientX: 80 }] } as any);
    });
    
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});
