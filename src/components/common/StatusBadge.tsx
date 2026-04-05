import React from 'react';
import { cn } from '@/lib/utils';

type Status = 'success' | 'warning' | 'error' | 'info' | 'pending';

interface StatusBadgeProps {
  status: Status;
  label: string;
  className?: string;
}

const statusStyles: Record<Status, string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-destructive/15 text-destructive',
  info: 'bg-primary/15 text-primary',
  pending: 'bg-muted text-muted-foreground',
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusStyles[status], className)}>
      {label}
    </span>
  );
}

export default StatusBadge;
