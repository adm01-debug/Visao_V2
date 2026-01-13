import React from 'react';
import { cn } from '@/lib/utils';

interface Activity { id: string; user: string; action: string; target?: string; time: Date; avatar?: string; }
interface ActivityFeedProps { activities: Activity[]; className?: string; }

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {activities.map(a => (
        <div key={a.id} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
            {a.avatar ? <img src={a.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : a.user[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm"><span className="font-medium">{a.user}</span> {a.action} {a.target && <span className="font-medium">{a.target}</span>}</p>
            <p className="text-xs text-muted-foreground">{a.time.toLocaleString('pt-BR')}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivityFeed;
