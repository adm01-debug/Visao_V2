import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useRef } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';

describe('useClickOutside', () => {
  it('calls handler on outside click', () => {
    const handler = vi.fn();
    const ref = { current: document.createElement('div') };
    document.body.appendChild(ref.current);
    renderHook(() => useClickOutside(ref, handler));
    document.body.click();
    expect(handler).toHaveBeenCalled();
  });

  it('does not call handler on inside click', () => {
    const handler = vi.fn();
    const ref = { current: document.createElement('div') };
    document.body.appendChild(ref.current);
    renderHook(() => useClickOutside(ref, handler));
    ref.current.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('cleans up listener on unmount', () => {
    const handler = vi.fn();
    const ref = { current: document.createElement('div') };
    const { unmount } = renderHook(() => useClickOutside(ref, handler));
    unmount();
    document.body.click();
    expect(handler).not.toHaveBeenCalled();
  });
});
