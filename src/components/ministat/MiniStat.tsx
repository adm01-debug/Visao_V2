import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MiniStatProps { label: string; value: string | number; change?: number; className?: string; }

export function MiniStat({ label, value, change, className }: MiniStatProps) {
  const trend = change ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : 'neutral';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';

  return (
    <div className={cn('p-3 rounded-lg bg-card border', className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-2xl font-bold">{value}</span>
        {change !== undefined && (
          <span className={cn('flex items-center text-xs', trendColor)}>
            <TrendIcon className="h-3 w-3 mr-0.5" />{Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
}

export default MiniStat;
