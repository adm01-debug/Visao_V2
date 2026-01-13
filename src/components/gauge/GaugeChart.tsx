import React from 'react';
import { cn } from '@/lib/utils';

interface GaugeChartProps { value: number; max?: number; size?: number; label?: string; className?: string; }

export function GaugeChart({ value, max = 100, size = 200, label, className }: GaugeChartProps) {
  const percentage = Math.min(100, (value / max) * 100);
  const angle = (percentage / 100) * 180;
  const radius = size * 0.4;
  const cx = size / 2;
  const cy = size / 2 + 10;

  const getColor = (p: number) => p < 30 ? '#22c55e' : p < 70 ? '#eab308' : '#ef4444';

  return (
    <div className={cn('inline-block', className)}>
      <svg width={size} height={size * 0.6}>
        <path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`} fill="none" stroke="#e5e7eb" strokeWidth="20" strokeLinecap="round" />
        <path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius * Math.cos(Math.PI - (angle * Math.PI / 180))} ${cy - radius * Math.sin(angle * Math.PI / 180)}`}
          fill="none" stroke={getColor(percentage)} strokeWidth="20" strokeLinecap="round" />
        <text x={cx} y={cy - 15} textAnchor="middle" fontSize="24" fontWeight="bold" fill="currentColor">{value}</text>
        {label && <text x={cx} y={cy + 10} textAnchor="middle" fontSize="12" fill="#6b7280">{label}</text>}
      </svg>
    </div>
  );
}

export default GaugeChart;
