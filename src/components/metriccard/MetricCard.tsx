import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: { value: number; period: string };
  icon?: React.ReactNode;
  color?: 'default' | 'green' | 'red' | 'blue' | 'yellow';
  className?: string;
}

const colors = {
  default: 'bg-card', green: 'bg-green-50 border-green-200',
  red: 'bg-red-50 border-red-200', blue: 'bg-blue-50 border-blue-200',
  yellow: 'bg-yellow-50 border-yellow-200'
};

export function MetricCard({ title, value, unit, change, icon, color = 'default', className }: MetricCardProps) {
  const TrendIcon = change ? (change.value > 0 ? TrendingUp : change.value < 0 ? TrendingDown : Minus) : null;

  return (
    <div className={cn('p-4 rounded-lg border', colors[color], className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {change && (
        <div className={cn('flex items-center gap-1 mt-2 text-sm', change.value > 0 ? 'text-green-600' : change.value < 0 ? 'text-red-600' : 'text-muted-foreground')}>
          {TrendIcon && <TrendIcon className="h-4 w-4" />}
          <span>{change.value > 0 ? '+' : ''}{change.value}%</span>
          <span className="text-muted-foreground">{change.period}</span>
        </div>
      )}
    </div>
  );
}

export default MetricCard;
