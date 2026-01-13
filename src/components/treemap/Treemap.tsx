import React from 'react';
import { cn } from '@/lib/utils';

interface TreemapItem { label: string; value: number; color?: string; }
interface TreemapProps { data: TreemapItem[]; className?: string; }

export function Treemap({ data, className }: TreemapProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  return (
    <div className={cn('grid grid-cols-4 gap-1 aspect-video', className)}>
      {data.map((item, i) => {
        const percent = (item.value / total) * 100;
        return (
          <div key={i} className="flex items-center justify-center p-2 text-white text-xs font-medium rounded"
            style={{ backgroundColor: item.color || colors[i % colors.length], gridColumn: percent > 25 ? 'span 2' : 'span 1', gridRow: percent > 30 ? 'span 2' : 'span 1' }}>
            <div className="text-center"><div>{item.label}</div><div className="text-sm opacity-75">{percent.toFixed(0)}%</div></div>
          </div>
        );
      })}
    </div>
  );
}

export default Treemap;
