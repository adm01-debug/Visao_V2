import { useState, useCallback, useMemo, useRef } from 'react';

interface UseVirtualListOptions<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualItem<T> {
  item: T;
  index: number;
  style: React.CSSProperties;
}

interface VirtualListResult<T> {
  virtualItems: VirtualItem<T>[];
  totalHeight: number;
  containerProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    ref: React.RefObject<HTMLDivElement>;
  };
  scrollToIndex: (index: number) => void;
}

/**
 * Hook for virtualizing long lists
 * Renders only visible items for better performance
 * 
 * @example
 * const { virtualItems, containerProps, totalHeight } = useVirtualList({
 *   items: data,
 *   itemHeight: 50,
 *   containerHeight: 400,
 * });
 */
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
}: UseVirtualListOptions<T>): VirtualListResult<T> {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2);
    
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const virtualItems = useMemo(() => {
    const result: VirtualItem<T>[] = [];
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (items[i] !== undefined) {
        result.push({
          item: items[i],
          index: i,
          style: {
            position: 'absolute',
            top: i * itemHeight,
            height: itemHeight,
            left: 0,
            right: 0,
          },
        });
      }
    }
    
    return result;
  }, [items, visibleRange, itemHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const targetScroll = Math.max(0, index * itemHeight - containerHeight / 2);
      containerRef.current.scrollTop = targetScroll;
    }
  }, [itemHeight, containerHeight]);

  const containerProps = useMemo(() => ({
    style: {
      height: containerHeight,
      overflow: 'auto' as const,
      position: 'relative' as const,
    },
    onScroll: handleScroll,
    ref: containerRef,
  }), [containerHeight, handleScroll]);

  return {
    virtualItems,
    totalHeight,
    containerProps,
    scrollToIndex,
  };
}

export default useVirtualList;
