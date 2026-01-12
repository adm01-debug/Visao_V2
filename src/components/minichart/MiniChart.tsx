import React from 'react';
import { cn } from '@/lib/utils';

interface MiniChartProps {
  data: number[];
  height?: number;
  color?: string;
  type?: 'line' | 'bar';
  className?: string;
}

export function MiniChart({ data, height = 40, color = 'currentColor', type = 'line', className }: MiniChartProps) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  if (type === 'bar') {
    return (
      <div className={cn('flex items-end gap-0.5', className)} style={{ height }}>
        {data.map((v, i) => (
          <div key={i} className="flex-1 rounded-t" style={{ height: `${((v - min) / range) * 100}%`, backgroundColor: color, minHeight: 2 }} />
        ))}
      </div>
    );
  }

  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ');

  return (
    <svg viewBox="0 0 100 100" className={className} style={{ height }} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

export default MiniChart;
