import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Clock, AlertTriangle } from 'lucide-react';

interface RoadmapItem { title: string; description?: string; status: 'done' | 'in-progress' | 'planned' | 'blocked'; date?: string; }
interface RoadmapProps { items: RoadmapItem[]; className?: string; }

const statusConfig = {
  done: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100' },
  'in-progress': { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100' },
  planned: { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100' },
  blocked: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100' },
};

export function Roadmap({ items, className }: RoadmapProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {items.map((item, i) => {
        const { icon: Icon, color, bg } = statusConfig[item.status];
        return (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center"><div className={cn('w-10 h-10 rounded-full flex items-center justify-center', bg)}><Icon className={cn('h-5 w-5', color)} /></div>{i < items.length - 1 && <div className="w-0.5 flex-1 bg-border my-2" />}</div>
            <div className="pb-8"><p className="font-medium">{item.title}</p>{item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}{item.date && <p className="text-xs text-muted-foreground mt-2">{item.date}</p>}</div>
          </div>
        );
      })}
    </div>
  );
}

export default Roadmap;
