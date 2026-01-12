import React from 'react';
import { cn } from '@/lib/utils';

interface MotionData {
  hour: number;
  count: number;
}

interface MotionHistogramProps {
  data: MotionData[];
  maxHeight?: number;
  className?: string;
}

export function MotionHistogram({ data, maxHeight = 100, className }: MotionHistogramProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className={cn('flex items-end gap-1', className)} style={{ height: maxHeight }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
            style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
            title={`${d.hour}h: ${d.count} movimentos`} />
          {i % 4 === 0 && <span className="text-xs text-muted-foreground">{d.hour}h</span>}
        </div>
      ))}
    </div>
  );
}

export default MotionHistogram;
