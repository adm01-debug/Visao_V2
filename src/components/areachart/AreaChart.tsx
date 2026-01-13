import React from 'react';
import { cn } from '@/lib/utils';

interface AreaChartProps { data: { label: string; value: number }[]; width?: number; height?: number; color?: string; className?: string; }

export function AreaChart({ data, width = 400, height = 200, color = '#3b82f6', className }: AreaChartProps) {
  const max = Math.max(...data.map(d => d.value));
  const padding = 20;
  const points = data.map((d, i) => `${padding + (i / (data.length - 1)) * (width - 2 * padding)},${height - padding - (d.value / max) * (height - 2 * padding)}`).join(' ');
  const areaPath = `M${padding},${height-padding} ${points} L${width-padding},${height-padding} Z`;

  return (
    <svg width={width} height={height} className={cn('rounded-lg', className)}>
      <defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d={areaPath} fill="url(#areaGradient)" />
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

export default AreaChart;
