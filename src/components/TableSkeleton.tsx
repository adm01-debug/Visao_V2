import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 4 }) => (
  <div className="space-y-2">
    <div className="flex gap-4 p-3 bg-muted/50 rounded">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, row) => (
      <div key={row} className="flex gap-4 p-3">
        {Array.from({ length: columns }).map((_, col) => (
          <Skeleton key={col} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export default TableSkeleton;
