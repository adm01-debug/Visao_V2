import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface SortableListProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  onReorder: (items: T[]) => void;
  className?: string;
}

export function SortableList<T>({ items, keyExtractor, renderItem, onReorder, className }: SortableListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDropIndex(index); };
  const handleDragEnd = () => {
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      const newItems = [...items];
      const [removed] = newItems.splice(dragIndex, 1);
      newItems.splice(dropIndex, 0, removed);
      onReorder(newItems);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  return (
    <div className={cn('space-y-1', className)}>
      {items.map((item, i) => (
        <div key={keyExtractor(item)} draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDragEnd={handleDragEnd}
          className={cn('flex items-center gap-2 p-2 rounded border bg-card cursor-move',
            dragIndex === i && 'opacity-50', dropIndex === i && dragIndex !== i && 'border-primary')}>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">{renderItem(item, i)}</div>
        </div>
      ))}
    </div>
  );
}

export default SortableList;
