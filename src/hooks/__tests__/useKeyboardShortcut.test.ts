import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcut } from '../useKeyboardShortcut';

describe('useKeyboardShortcut', () => {
  it('should call callback on key press', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcut('a', callback));
    
    const event = new KeyboardEvent('keydown', { key: 'a' });
    document.dispatchEvent(event);
    
    expect(callback).toHaveBeenCalled();
  });

  it('should handle Ctrl modifier', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcut('s', callback, { ctrl: true }));
    
    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    document.dispatchEvent(event);
    
    expect(callback).toHaveBeenCalled();
  });

  it('should not call without modifier when required', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcut('s', callback, { ctrl: true }));
    
    const event = new KeyboardEvent('keydown', { key: 's' });
    document.dispatchEvent(event);
    
    expect(callback).not.toHaveBeenCalled();
  });

  it('should cleanup on unmount', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcut('a', callback));
    
    unmount();
    
    const event = new KeyboardEvent('keydown', { key: 'a' });
    document.dispatchEvent(event);
    
    expect(callback).not.toHaveBeenCalled();
  });
});
