import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/media/Avatar';

interface ActivityItemProps {
  user: { name: string; avatar?: string };
  action: string;
  target?: string;
  timestamp: string;
  className?: string;
}

export function ActivityItem({ user, action, target, timestamp, className }: ActivityItemProps) {
  return (
    <div className={cn('flex items-start gap-3 py-3', className)}>
      <Avatar src={user.avatar} name={user.name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{user.name}</span>{' '}
          <span className="text-muted-foreground">{action}</span>
          {target && <span className="font-medium"> {target}</span>}
        </p>
        <p className="text-xs text-muted-foreground">{timestamp}</p>
      </div>
    </div>
  );
}

export default ActivityItem;
