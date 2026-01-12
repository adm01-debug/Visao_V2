import React from 'react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  max?: number;
  children: React.ReactNode;
  className?: string;
}

export function NotificationBadge({ count, max = 99, children, className }: NotificationBadgeProps) {
  const display = count > max ? `${max}+` : count.toString();

  return (
    <div className={cn('relative inline-block', className)}>
      {children}
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
          {display}
        </span>
      )}
    </div>
  );
}

export default NotificationBadge;
