import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Column<T> { key: keyof T; header: string; sortable?: boolean; render?: (item: T) => React.ReactNode; width?: string; }

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sortKey?: keyof T;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: keyof T) => void;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({ data, columns, sortKey, sortOrder, onSort, onRowClick, className }: DataTableProps<T>) {
  return (
    <div className={cn('overflow-auto rounded-lg border', className)}>
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map(col => (
              <th key={String(col.key)} onClick={() => col.sortable && onSort?.(col.key)}
                className={cn('px-4 py-3 text-left font-medium', col.sortable && 'cursor-pointer hover:bg-muted')} style={{ width: col.width }}>
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i} onClick={() => onRowClick?.(item)} className={cn('border-t', onRowClick && 'cursor-pointer hover:bg-muted/50')}>
              {columns.map(col => <td key={String(col.key)} className="px-4 py-3">{col.render ? col.render(item) : String(item[col.key] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
