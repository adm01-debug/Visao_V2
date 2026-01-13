import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps { value: number; max?: number; size?: number; strokeWidth?: number; color?: string; className?: string; }

export function ProgressRing({ value, max = 100, size = 120, strokeWidth = 8, color = '#3b82f6', className }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / max) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" />
      </svg>
      <span className="absolute text-xl font-bold">{Math.round((value/max)*100)}%</span>
    </div>
  );
}

export default ProgressRing;
