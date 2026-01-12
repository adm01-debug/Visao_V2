import React from 'react';
import { cn } from '@/lib/utils';

interface Widget {
  id: string;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  content: React.ReactNode;
}

interface WidgetGridProps {
  widgets: Widget[];
  className?: string;
}

const sizeClasses = { sm: 'col-span-1', md: 'col-span-2', lg: 'col-span-3' };

export function WidgetGrid({ widgets, className }: WidgetGridProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-4', className)}>
      {widgets.map(w => (
        <div key={w.id} className={cn('p-4 rounded-lg border bg-card', sizeClasses[w.size || 'sm'])}>
          <h3 className="font-medium mb-3">{w.title}</h3>
          {w.content}
        </div>
      ))}
    </div>
  );
}

export default WidgetGrid;
