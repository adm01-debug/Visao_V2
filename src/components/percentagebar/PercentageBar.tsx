import React from 'react';
import { cn } from '@/lib/utils';

interface PercentageBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  color?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colors = { default: 'bg-primary', success: 'bg-green-500', warning: 'bg-yellow-500', danger: 'bg-red-500' };
const sizes = { sm: 'h-1', md: 'h-2', lg: 'h-4' };

export function PercentageBar({ value, max = 100, showLabel = true, color = 'default', size = 'md', className }: PercentageBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && <div className="flex justify-between text-sm"><span>{value.toFixed(0)}</span><span className="text-muted-foreground">{max}</span></div>}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', sizes[size])}>
        <div className={cn('h-full transition-all', colors[color])} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

export default PercentageBar;
