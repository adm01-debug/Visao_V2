import React from 'react';
import { cn } from '@/lib/utils';

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  date?: string;
  icon?: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
      {items.map((item, i) => (
        <div key={item.id} className="relative pl-10 pb-8 last:pb-0">
          <div className="absolute left-2 w-4 h-4 rounded-full bg-primary border-2 border-background" />
          <div>
            {item.date && <span className="text-xs text-muted-foreground">{item.date}</span>}
            <h4 className="font-medium">{item.title}</h4>
            {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Timeline;
