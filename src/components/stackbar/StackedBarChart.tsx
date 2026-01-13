import React from 'react';
import { cn } from '@/lib/utils';

interface StackedBarChartProps { data: { label: string; values: { name: string; value: number; color: string }[] }[]; className?: string; }

export function StackedBarChart({ data, className }: StackedBarChartProps) {
  const max = Math.max(...data.map(d => d.values.reduce((s, v) => s + v.value, 0)));

  return (
    <div className={cn('space-y-3', className)}>
      {data.map((item, i) => {
        const total = item.values.reduce((s, v) => s + v.value, 0);
        return (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1"><span>{item.label}</span><span>{total}</span></div>
            <div className="h-6 rounded overflow-hidden flex" style={{ width: `${(total/max)*100}%` }}>
              {item.values.map((v, j) => <div key={j} style={{ width: `${(v.value/total)*100}%`, backgroundColor: v.color }} title={`${v.name}: ${v.value}`} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StackedBarChart;
