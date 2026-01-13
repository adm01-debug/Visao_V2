import React from 'react';
import { cn } from '@/lib/utils';

interface MetricBarProps { label: string; value: number; max?: number; color?: string; showValue?: boolean; className?: string; }

export function MetricBar({ label, value, max = 100, color = '#3b82f6', showValue = true, className }: MetricBarProps) {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        {showValue && <span className="font-medium">{value}/{max}</span>}
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default MetricBar;
