import React from 'react';
import { cn } from '@/lib/utils';

interface HorizontalBarChartProps { data: { label: string; value: number; color?: string }[]; className?: string; }

export function HorizontalBarChart({ data, className }: HorizontalBarChartProps) {
  const max = Math.max(...data.map(d => d.value));

  return (
    <div className={cn('space-y-3', className)}>
      {data.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-sm"><span>{item.label}</span><span className="font-medium">{item.value.toLocaleString()}</span></div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color || '#3b82f6' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default HorizontalBarChart;
