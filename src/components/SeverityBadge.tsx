import React from 'react';
import { cn } from '@/lib/utils';

type Severity = 'low' | 'medium' | 'high' | 'critical';

const styles: Record<Severity, string> = {
  low: 'bg-primary/15 text-primary',
  medium: 'bg-warning/15 text-warning',
  high: 'bg-warning/20 text-warning',
  critical: 'bg-destructive/15 text-destructive',
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
