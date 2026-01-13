import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TrendIndicatorProps { value: number; previousValue?: number; format?: 'percent' | 'number' | 'currency'; showIcon?: boolean; className?: string; }

export function TrendIndicator({ value, previousValue, format = 'percent', showIcon = true, className }: TrendIndicatorProps) {
  const change = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
  const Icon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const color = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';
  const formatValue = (v: number) => format === 'currency' ? `R$ ${v.toFixed(2)}` : format === 'percent' ? `${v.toFixed(1)}%` : v.toLocaleString();

  return (
    <span className={cn('inline-flex items-center gap-1 font-medium', color, className)}>
      {showIcon && <Icon className="h-4 w-4" />}
      {formatValue(Math.abs(change))}
    </span>
  );
}

export default TrendIndicator;
