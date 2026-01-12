import React from 'react';
import { cn } from '@/lib/utils';

interface DataPoint { label: string; value: number; color?: string; }

interface SimpleChartProps {
  data: DataPoint[];
  type?: 'bar' | 'line' | 'pie';
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
  className?: string;
}

export function SimpleChart({ data, type = 'bar', height = 200, showLabels = true, showValues = true, className }: SimpleChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (type === 'bar') {
    return (
      <div className={cn('flex items-end gap-2', className)} style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            {showValues && <span className="text-xs mb-1">{d.value}</span>}
            <div className="w-full rounded-t" style={{ height: `${(d.value / maxValue) * 100}%`, backgroundColor: d.color || '#3b82f6', minHeight: 4 }} />
            {showLabels && <span className="text-xs mt-1 truncate w-full text-center">{d.label}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'pie') {
    let cumulative = 0;
    const slices = data.map((d, i) => {
      const start = cumulative;
      cumulative += (d.value / total) * 360;
      return { ...d, start, end: cumulative, index: i };
    });
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <svg width={height} height={height} viewBox="0 0 100 100">
          {slices.map((s, i) => {
            const startAngle = (s.start - 90) * Math.PI / 180;
            const endAngle = (s.end - 90) * Math.PI / 180;
            const x1 = 50 + 45 * Math.cos(startAngle);
            const y1 = 50 + 45 * Math.sin(startAngle);
            const x2 = 50 + 45 * Math.cos(endAngle);
            const y2 = 50 + 45 * Math.sin(endAngle);
            const largeArc = s.end - s.start > 180 ? 1 : 0;
            return <path key={i} d={`M50,50 L${x1},${y1} A45,45 0 ${largeArc},1 ${x2},${y2} Z`} fill={s.color || `hsl(${i * 60}, 70%, 50%)`} />;
          })}
        </svg>
        {showLabels && (
          <div className="space-y-1">
            {data.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: d.color || `hsl(${i * 60}, 70%, 50%)` }} />
                <span>{d.label}: {d.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <div className={className}>Chart type not supported</div>;
}

export default SimpleChart;
