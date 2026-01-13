import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MiniStatCardProps { label: string; value: string | number; change?: number; className?: string; }

export function MiniStatCard({ label, value, change, className }: MiniStatCardProps) {
  const trend = change && change > 0 ? 'up' : change && change < 0 ? 'down' : 'neutral';
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const color = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-end justify-between mt-1">
        <span className="text-2xl font-bold">{value}</span>
        {change !== undefined && <div className={cn('flex items-center gap-1 text-sm', color)}><Icon className="h-4 w-4" />{Math.abs(change)}%</div>}
      </div>
    </div>
  );
}

export default MiniStatCard;
