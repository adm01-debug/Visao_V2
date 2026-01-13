import React from 'react';
import { cn } from '@/lib/utils';

interface FunnelChartProps { data: { label: string; value: number; color?: string }[]; className?: string; }

export function FunnelChart({ data, className }: FunnelChartProps) {
  const max = Math.max(...data.map(d => d.value));

  return (
    <div className={cn('space-y-2', className)}>
      {data.map((item, i) => {
        const width = (item.value / max) * 100;
        return (
          <div key={i} className="flex items-center gap-4">
            <div className="w-24 text-sm text-right text-muted-foreground">{item.label}</div>
            <div className="flex-1 relative h-10">
              <div className="absolute inset-y-0 left-0 rounded-r-lg flex items-center justify-end pr-4 text-white font-medium text-sm"
                style={{ width: `${width}%`, backgroundColor: item.color || '#3b82f6' }}>
                {item.value.toLocaleString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default FunnelChart;
