import React from 'react';
import { cn } from '@/lib/utils';

type Status = 'success' | 'warning' | 'error' | 'info' | 'pending';

interface StatusBadgeProps {
  status: Status;
  label: string;
  className?: string;
}

const statusStyles: Record<Status, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusStyles[status], className)}>
      {label}
    </span>
  );
}

export default StatusBadge;
