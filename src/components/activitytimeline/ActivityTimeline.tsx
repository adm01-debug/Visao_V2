import React from 'react';
import { cn } from '@/lib/utils';

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  icon?: React.ReactNode;
  type?: 'default' | 'success' | 'warning' | 'error';
}

interface ActivityTimelineProps {
  items: TimelineItem[];
  className?: string;
}

const typeColors = { default: 'bg-gray-200', success: 'bg-green-500', warning: 'bg-yellow-500', error: 'bg-red-500' };

export function ActivityTimeline({ items, className }: ActivityTimelineProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {items.map((item, i) => (
        <div key={item.id} className="relative pl-8">
          {i < items.length - 1 && <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-border" />}
          <div className={cn('absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center', item.icon ? 'bg-primary/10' : typeColors[item.type || 'default'])}>
            {item.icon || <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <div className="pb-4">
            <p className="font-medium text-sm">{item.title}</p>
            {item.description && <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>}
            <p className="text-xs text-muted-foreground mt-1">{item.timestamp.toLocaleString('pt-BR')}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivityTimeline;
