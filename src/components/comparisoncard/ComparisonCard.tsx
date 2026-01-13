import React from 'react';
import { cn } from '@/lib/utils';

interface ComparisonCardProps { title: string; items: { label: string; valueA: number; valueB: number }[]; labelA?: string; labelB?: string; className?: string; }

export function ComparisonCard({ title, items, labelA = 'A', labelB = 'B', className }: ComparisonCardProps) {
  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="flex justify-between text-xs text-muted-foreground mb-2 px-2"><span>{labelA}</span><span>{labelB}</span></div>
      <div className="space-y-3">
        {items.map((item, i) => {
          const total = item.valueA + item.valueB;
          const pctA = (item.valueA / total) * 100;
          return (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1"><span>{item.valueA}</span><span className="font-medium">{item.label}</span><span>{item.valueB}</span></div>
              <div className="h-2 flex rounded-full overflow-hidden">
                <div className="bg-blue-500" style={{ width: `${pctA}%` }} />
                <div className="bg-orange-500" style={{ width: `${100 - pctA}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ComparisonCard;
