import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

export function StatsCard({ title, value, change, icon, className }: StatsCardProps) {
  const trend = change === undefined ? null : change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
  
  return (
    <div className={cn('bg-card rounded-lg border p-4', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {trend && (
          <span className={cn('flex items-center text-sm', {
            'text-green-600': trend === 'up',
            'text-red-600': trend === 'down',
            'text-gray-500': trend === 'neutral',
          })}>
            {trend === 'up' && <TrendingUp className="h-4 w-4 mr-1" />}
            {trend === 'down' && <TrendingDown className="h-4 w-4 mr-1" />}
            {trend === 'neutral' && <Minus className="h-4 w-4 mr-1" />}
            {Math.abs(change!)}%
          </span>
        )}
      </div>
    </div>
  );
}

export default StatsCard;
