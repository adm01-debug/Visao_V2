import React from 'react';
import { cn } from '@/lib/utils';

interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  emptyMessage?: string;
  gap?: 0 | 1 | 2 | 3 | 4;
}

const gapClasses = { 0: 'gap-0', 1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4' };

export function List<T>({
  items, renderItem, keyExtractor, className, emptyMessage = 'Lista vazia', gap = 2
}: ListProps<T>) {
  if (items.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <ul className={cn('flex flex-col', gapClasses[gap], className)}>
      {items.map((item, index) => (
        <li key={keyExtractor(item, index)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

export default List;
