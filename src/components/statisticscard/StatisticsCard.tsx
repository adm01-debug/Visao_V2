import React from 'react';
import { cn } from '@/lib/utils';
import { MiniChart } from '@/components/minichart/MiniChart';

interface StatisticsCardProps {
  title: string;
  value: string | number;
  data?: number[];
  change?: { value: number; label: string };
  icon?: React.ReactNode;
  className?: string;
}

export function StatisticsCard({ title, value, data, change, icon, className }: StatisticsCardProps) {
  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {change && (
        <p className={cn('text-xs mt-1', change.value >= 0 ? 'text-green-500' : 'text-red-500')}>
          {change.value >= 0 ? '+' : ''}{change.value}% {change.label}
        </p>
      )}
      {data && data.length > 0 && <MiniChart data={data} height={40} className="mt-3" color="#3b82f6" />}
    </div>
  );
}

export default StatisticsCard;
