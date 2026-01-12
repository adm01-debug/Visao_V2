import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

type SortDirection = 'asc' | 'desc' | null;

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: SortDirection } | null;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({ label, sortKey, currentSort, onSort, className }: SortableHeaderProps) {
  const isActive = currentSort?.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  return (
    <button onClick={() => onSort(sortKey)}
      className={cn('flex items-center gap-1 font-medium hover:text-primary transition-colors', className)}>
      {label}
      {direction === 'asc' ? <ArrowUp className="h-4 w-4" /> :
       direction === 'desc' ? <ArrowDown className="h-4 w-4" /> :
       <ArrowUpDown className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

export default SortableHeader;
