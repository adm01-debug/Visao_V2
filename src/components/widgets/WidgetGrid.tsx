/**
 * VISÃO - Widget Grid Container
 */
import React from 'react';
import { cn } from '@/lib/utils';

interface WidgetGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

const colClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

export function WidgetGrid({ children, columns = 3, className }: WidgetGridProps) {
  return (
    <div className={cn('grid gap-4 auto-rows-min', colClasses[columns], className)}>{children}</div>
  );
}
