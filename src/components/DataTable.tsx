import React, { memo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from './TableSkeleton';
import { EmptyState } from './EmptyState';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

function DataTableComponent<T extends { id: string }>({
  data,
  columns,
  loading,
  emptyMessage = 'Nenhum dado encontrado',
  onRowClick,
}: DataTableProps<T>) {
  if (loading) return <TableSkeleton rows={5} columns={columns.length} />;
  if (!data.length) return <EmptyState title={emptyMessage} />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={String(col.key)}>{col.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow
            key={item.id}
            onClick={() => onRowClick?.(item)}
            className={onRowClick ? 'cursor-pointer hover:bg-muted' : ''}
          >
            {columns.map((col) => (
              <TableCell key={String(col.key)}>
                {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '')}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export const DataTable = memo(DataTableComponent) as typeof DataTableComponent;
