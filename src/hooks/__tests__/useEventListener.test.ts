import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useEventListener } from '@/hooks/useEventListener';

describe('useEventListener', () => {
  it('adds event listener', () => {
    const handler = vi.fn();
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useEventListener('click', handler));
    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), undefined);
  });

  it('removes listener on unmount', () => {
    const handler = vi.fn();
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useEventListener('click', handler));
    unmount();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('supports custom element', () => {
    const handler = vi.fn();
    const element = document.createElement('div');
    const addSpy = vi.spyOn(element, 'addEventListener');
    renderHook(() => useEventListener('click', handler, element));
    expect(addSpy).toHaveBeenCalled();
  });
});
