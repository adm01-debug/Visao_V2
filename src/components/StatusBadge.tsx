import React from 'react';
import { cn } from '@/lib/utils';

type Status = 'online' | 'offline' | 'warning' | 'error';

const statusStyles: Record<Status, string> = {
  online: 'bg-green-500/20 text-green-500 border-green-500/30',
  offline: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
  warning: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  error: 'bg-red-500/20 text-red-500 border-red-500/30',
};

interface StatusBadgeProps {
  status: Status;
  label?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, showDot = true }) => (
  <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border', statusStyles[status])}>
    {showDot && <span className={cn('w-1.5 h-1.5 rounded-full', status === 'online' ? 'bg-green-500 animate-pulse' : status === 'offline' ? 'bg-gray-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-red-500')} />}
    {label || status}
  </span>
);

export default StatusBadge;
