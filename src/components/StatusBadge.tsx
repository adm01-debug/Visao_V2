import React from 'react';
import { cn } from '@/lib/utils';

type Status = 'online' | 'offline' | 'warning' | 'error';

const statusStyles: Record<Status, string> = {
  online: 'bg-success/20 text-success border-success/30',
  offline: 'bg-muted text-muted-foreground border-border',
  warning: 'bg-warning/20 text-warning border-warning/30',
  error: 'bg-destructive/20 text-destructive border-destructive/30',
};

const dotStyles: Record<Status, string> = {
  online: 'bg-success animate-pulse',
  offline: 'bg-muted-foreground',
  warning: 'bg-warning',
  error: 'bg-destructive',
};

interface StatusBadgeProps {
  status: Status;
  label?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, showDot = true }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
      statusStyles[status]
    )}
  >
    {showDot && <span className={cn('w-1.5 h-1.5 rounded-full', dotStyles[status])} />}
    {label || status}
  </span>
);

export default StatusBadge;
