import React from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
  emptyMessage?: string;
}

export function Table<T extends Record<string, unknown>>({
  data, columns, className, emptyMessage = 'Nenhum dado encontrado'
}: TableProps<T>) {
  if (data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            {columns.map((col, i) => (
              <th key={i} className={cn('text-left p-3 font-medium', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIndex) => (
            <tr key={rowIndex} className="border-b hover:bg-muted/50">
              {columns.map((col, colIndex) => (
                <td key={colIndex} className={cn('p-3', col.className)}>
                  {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
