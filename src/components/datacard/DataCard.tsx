import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DataCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function DataCard({ title, value, change, changeLabel, icon, className }: DataCardProps) {
  const trend = change ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : null;

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {change !== undefined && (
        <div className={cn('flex items-center gap-1 text-sm mt-1',
          trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground')}>
          {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : trend === 'down' ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          {Math.abs(change)}% {changeLabel || ''}
        </div>
      )}
    </div>
  );
}

export default DataCard;
