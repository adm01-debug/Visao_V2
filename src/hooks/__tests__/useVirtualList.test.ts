import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVirtualList } from '../useVirtualList';

describe('useVirtualList', () => {
  const mockItems = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));

  it('should return virtual items for visible range', () => {
    const { result } = renderHook(() =>
      useVirtualList({
        items: mockItems,
        itemHeight: 50,
        containerHeight: 400,
        overscan: 3,
      })
    );

    expect(result.current.virtualItems.length).toBeLessThan(mockItems.length);
    expect(result.current.virtualItems.length).toBeGreaterThan(0);
  });

  it('should calculate total height correctly', () => {
    const { result } = renderHook(() =>
      useVirtualList({
        items: mockItems,
        itemHeight: 50,
        containerHeight: 400,
      })
    );

    expect(result.current.totalHeight).toBe(1000 * 50);
  });

  it('should provide container props', () => {
    const { result } = renderHook(() =>
      useVirtualList({
        items: mockItems,
        itemHeight: 50,
        containerHeight: 400,
      })
    );

    expect(result.current.containerProps.style.height).toBe(400);
    expect(result.current.containerProps.style.overflow).toBe('auto');
    expect(result.current.containerProps.style.position).toBe('relative');
  });

  it('should have correct item styles', () => {
    const { result } = renderHook(() =>
      useVirtualList({
        items: mockItems,
        itemHeight: 50,
        containerHeight: 400,
      })
    );

    const firstItem = result.current.virtualItems[0];
    expect(firstItem.style.position).toBe('absolute');
    expect(firstItem.style.height).toBe(50);
  });

  it('should provide scrollToIndex function', () => {
    const { result } = renderHook(() =>
      useVirtualList({
        items: mockItems,
        itemHeight: 50,
        containerHeight: 400,
      })
    );

    expect(typeof result.current.scrollToIndex).toBe('function');
  });
});
