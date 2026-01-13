import React from 'react';
import { cn } from '@/lib/utils';

interface ComparisonBarProps { leftValue: number; rightValue: number; leftLabel: string; rightLabel: string; leftColor?: string; rightColor?: string; className?: string; }

export function ComparisonBar({ leftValue, rightValue, leftLabel, rightLabel, leftColor = '#3b82f6', rightColor = '#ef4444', className }: ComparisonBarProps) {
  const total = leftValue + rightValue;
  const leftPercent = (leftValue / total) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between text-sm"><span>{leftLabel}: {leftValue}</span><span>{rightLabel}: {rightValue}</span></div>
      <div className="h-4 rounded-full overflow-hidden flex">
        <div style={{ width: `${leftPercent}%`, backgroundColor: leftColor }} />
        <div style={{ width: `${100 - leftPercent}%`, backgroundColor: rightColor }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground"><span>{leftPercent.toFixed(1)}%</span><span>{(100-leftPercent).toFixed(1)}%</span></div>
    </div>
  );
}

export default ComparisonBar;
