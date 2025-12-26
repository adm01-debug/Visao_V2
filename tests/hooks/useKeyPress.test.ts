import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyPress } from '../useKeyPress';

describe('useKeyPress', () => {
  it('returns false initially', () => {
    const { result } = renderHook(() => useKeyPress('Enter'));
    expect(result.current).toBe(false);
  });

  it('returns true when key is pressed', () => {
    const { result } = renderHook(() => useKeyPress('Enter'));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });
    expect(result.current).toBe(true);
  });

  it('returns false when key is released', () => {
    const { result } = renderHook(() => useKeyPress('Enter'));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    });
    expect(result.current).toBe(false);
  });

  it('handles multiple keys', () => {
    const { result } = renderHook(() => useKeyPress(['a', 'b']));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });
    expect(result.current).toBe(true);
  });

  it('cleans up listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyPress('Enter'));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
  });
});
