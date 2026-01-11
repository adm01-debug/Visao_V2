import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGlobalShortcuts } from '../useGlobalShortcuts';

describe('useGlobalShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers keyboard shortcut', () => {
    const handler = vi.fn();
    renderHook(() => useGlobalShortcuts([{ key: 'k', ctrl: true, handler }]));
    
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    document.dispatchEvent(event);
    
    expect(handler).toHaveBeenCalled();
  });

  it('does not trigger on partial match', () => {
    const handler = vi.fn();
    renderHook(() => useGlobalShortcuts([{ key: 'k', ctrl: true, handler }]));
    
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: false });
    document.dispatchEvent(event);
    
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports multiple shortcuts', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    renderHook(() => useGlobalShortcuts([
      { key: 'k', ctrl: true, handler: handler1 },
      { key: 's', ctrl: true, handler: handler2 },
    ]));
    
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
    
    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it('cleans up on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useGlobalShortcuts([{ key: 'k', ctrl: true, handler }]));
    
    unmount();
    
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports disabled state', () => {
    const handler = vi.fn();
    renderHook(() => useGlobalShortcuts([{ key: 'k', ctrl: true, handler }], { disabled: true }));
    
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();
  });
});
