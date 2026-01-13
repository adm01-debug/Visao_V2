import React from 'react';
import { cn } from '@/lib/utils';

interface WaterfallItem { label: string; value: number; type?: 'positive' | 'negative' | 'total'; }
interface WaterfallChartProps { data: WaterfallItem[]; className?: string; }

export function WaterfallChart({ data, className }: WaterfallChartProps) {
  let running = 0;
  const max = Math.max(...data.map(d => Math.abs(d.value)));

  return (
    <div className={cn('space-y-2', className)}>
      {data.map((item, i) => {
        const prev = running;
        running += item.type === 'total' ? 0 : item.value;
        const color = item.type === 'total' ? 'bg-blue-500' : item.value >= 0 ? 'bg-green-500' : 'bg-red-500';
        const width = (Math.abs(item.value) / max) * 100;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="w-20 text-xs text-right">{item.label}</span>
            <div className="flex-1 h-6 bg-muted rounded relative">
              <div className={cn('absolute h-full rounded', color)} style={{ width: `${width}%`, left: item.value >= 0 ? '50%' : `${50 - width}%` }} />
            </div>
            <span className="w-16 text-xs">{item.value >= 0 ? '+' : ''}{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}

export default WaterfallChart;
