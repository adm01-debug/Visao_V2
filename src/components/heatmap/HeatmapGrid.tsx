import React from 'react';
import { cn } from '@/lib/utils';

interface HeatmapGridProps { data: number[][]; xLabels?: string[]; yLabels?: string[]; colors?: { low: string; mid: string; high: string }; className?: string; }

export function HeatmapGrid({ data, xLabels, yLabels, colors = { low: '#22c55e', mid: '#eab308', high: '#ef4444' }, className }: HeatmapGridProps) {
  const max = Math.max(...data.flat());
  const min = Math.min(...data.flat());

  const getColor = (value: number) => {
    const ratio = (value - min) / (max - min || 1);
    if (ratio < 0.33) return colors.low;
    if (ratio < 0.66) return colors.mid;
    return colors.high;
  };

  return (
    <div className={cn('overflow-auto', className)}>
      <div className="inline-flex flex-col">
        {xLabels && (
          <div className="flex">
            <div className="w-12" />
            {xLabels.map((l, i) => <div key={i} className="w-10 text-xs text-center text-muted-foreground">{l}</div>)}
          </div>
        )}
        {data.map((row, i) => (
          <div key={i} className="flex">
            {yLabels && <div className="w-12 text-xs text-right pr-2 text-muted-foreground flex items-center justify-end">{yLabels[i]}</div>}
            {row.map((cell, j) => (
              <div key={j} className="w-10 h-10 flex items-center justify-center text-xs text-white font-medium"
                style={{ backgroundColor: getColor(cell) }}>{cell}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default HeatmapGrid;
