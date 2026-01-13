import React from 'react';
import { cn } from '@/lib/utils';

interface SparklineProps { data: number[]; width?: number; height?: number; color?: string; className?: string; }

export function Sparkline({ data, width = 100, height = 30, color = '#3b82f6', className }: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ');

  return (
    <svg width={width} height={height} className={className}>
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

export default Sparkline;
