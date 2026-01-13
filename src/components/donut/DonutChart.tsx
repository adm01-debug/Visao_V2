import React from 'react';
import { cn } from '@/lib/utils';

interface DonutChartProps { data: { label: string; value: number; color: string }[]; size?: number; thickness?: number; className?: string; }

export function DonutChart({ data, size = 200, thickness = 30, className }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn('relative inline-block', className)}>
      <svg width={size} height={size}>
        {data.map((item, i) => {
          const strokeDasharray = (item.value / total) * circumference;
          const strokeDashoffset = -offset;
          offset += strokeDasharray;
          return (
            <circle key={i} cx={size/2} cy={size/2} r={radius} fill="none" stroke={item.color} strokeWidth={thickness}
              strokeDasharray={`${strokeDasharray} ${circumference}`} strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${size/2} ${size/2})`} />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-2xl font-bold">{total}</span>
        <span className="text-xs text-muted-foreground">Total</span>
      </div>
    </div>
  );
}

export default DonutChart;
