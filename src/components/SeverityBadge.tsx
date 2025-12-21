import React from 'react';
import { cn } from '@/lib/utils';

type Severity = 'low' | 'medium' | 'high' | 'critical';

const styles: Record<Severity, string> = {
  low: 'bg-blue-500/20 text-blue-500',
  medium: 'bg-yellow-500/20 text-yellow-500',
  high: 'bg-orange-500/20 text-orange-500',
  critical: 'bg-red-500/20 text-red-500',
};

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className }) => (
  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', styles[severity], className)}>
    {severity.toUpperCase()}
  </span>
);

export default SeverityBadge;
