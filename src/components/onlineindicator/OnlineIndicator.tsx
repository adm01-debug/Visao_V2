import React from 'react';
import { cn } from '@/lib/utils';

interface OnlineIndicatorProps {
  isOnline: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const sizes = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' };

export function OnlineIndicator({ isOnline, showLabel = false, size = 'md', pulse = true, className }: OnlineIndicatorProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('rounded-full', sizes[size], isOnline ? 'bg-green-500' : 'bg-gray-400', isOnline && pulse && 'animate-pulse')} />
      {showLabel && <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>}
    </span>
  );
}

export default OnlineIndicator;
