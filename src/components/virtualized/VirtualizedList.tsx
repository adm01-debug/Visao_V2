import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface VirtualizedListProps<T> { items: T[]; itemHeight: number; containerHeight: number; renderItem: (item: T, index: number) => React.ReactNode; className?: string; }

export function VirtualizedList<T>({ items, itemHeight, containerHeight, renderItem, className }: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + Math.ceil(containerHeight / itemHeight) + 1, items.length);
  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;

  return (
    <div ref={containerRef} className={cn('overflow-auto', className)} style={{ height: containerHeight }}
      onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => (
          <div key={startIndex + i} style={{ position: 'absolute', top: (startIndex + i) * itemHeight, height: itemHeight, width: '100%' }}>
            {renderItem(item, startIndex + i)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VirtualizedList;
