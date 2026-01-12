import React from 'react';
import { cn } from '@/lib/utils';

interface CircleProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showValue?: boolean;
  label?: string;
  className?: string;
}

export function CircleProgress({ value, max = 100, size = 100, strokeWidth = 8, color = '#3b82f6', showValue = true, label, className }: CircleProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-300" />
      </svg>
      {showValue && <span className="absolute text-lg font-bold" style={{ marginTop: size/2 - 12 }}>{Math.round(pct)}%</span>}
      {label && <span className="text-sm text-muted-foreground mt-2">{label}</span>}
    </div>
  );
}

export default CircleProgress;
