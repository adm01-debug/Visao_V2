import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDragDrop } from '@/hooks/useDragDrop';

describe('useDragDrop', () => {
  it('provides drag handlers', () => {
    const { result } = renderHook(() => useDragDrop({ onDrop: vi.fn() }));
    expect(result.current.dragHandlers).toBeDefined();
    expect(result.current.dragHandlers.onDragOver).toBeDefined();
    expect(result.current.dragHandlers.onDrop).toBeDefined();
  });

  it('tracks isDragging state', () => {
    const { result } = renderHook(() => useDragDrop({ onDrop: vi.fn() }));
    expect(result.current.isDragging).toBe(false);
  });

  it('calls onDrop handler', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useDragDrop({ onDrop }));
    const event = { preventDefault: vi.fn(), dataTransfer: { files: [] } };
    act(() => { result.current.dragHandlers.onDrop(event as any); });
    expect(onDrop).toHaveBeenCalled();
  });
});
