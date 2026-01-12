import React from 'react';
import { cn } from '@/lib/utils';

interface MasonryGridProps { children: React.ReactNode[]; columns?: number; gap?: number; className?: string; }

export function MasonryGrid({ children, columns = 3, gap = 16, className }: MasonryGridProps) {
  const cols = Array.from({ length: columns }, () => [] as React.ReactNode[]);
  children.forEach((child, i) => cols[i % columns].push(child));

  return (
    <div className={cn('flex', className)} style={{ gap }}>
      {cols.map((col, i) => (
        <div key={i} className="flex-1 flex flex-col" style={{ gap }}>
          {col}
        </div>
      ))}
    </div>
  );
}

export default MasonryGrid;
