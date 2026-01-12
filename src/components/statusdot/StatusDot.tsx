import React from 'react';
import { cn } from '@/lib/utils';

type Status = 'online' | 'offline' | 'busy' | 'away';

interface StatusDotProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const statusColors: Record<Status, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
};

const sizeClasses = { sm: 'h-2 w-2', md: 'h-3 w-3', lg: 'h-4 w-4' };

export function StatusDot({ status, size = 'md', pulse = false, className }: StatusDotProps) {
  return (
    <span className={cn(
      'rounded-full inline-block',
      statusColors[status],
      sizeClasses[size],
      pulse && 'animate-pulse',
      className
    )} />
  );
}

export default StatusDot;
