import React from 'react';
import { cn } from '@/lib/utils';

interface RadarChartProps { data: { label: string; value: number }[]; maxValue?: number; size?: number; className?: string; }

export function RadarChart({ data, maxValue = 100, size = 200, className }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.4;
  const angleStep = (2 * Math.PI) / data.length;

  const points = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (d.value / maxValue) * radius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const pathData = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ',' + p.y).join(' ') + ' Z';

  return (
    <div className={cn('inline-block', className)}>
      <svg width={size} height={size}>
        {[0.25, 0.5, 0.75, 1].map(scale => (
          <polygon key={scale} fill="none" stroke="#e5e7eb" points={data.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = radius * scale;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
          }).join(' ')} />
        ))}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={cx + radius * Math.cos(angle)} y2={cy + radius * Math.sin(angle)} stroke="#e5e7eb" />
              <text x={cx + (radius + 15) * Math.cos(angle)} y={cy + (radius + 15) * Math.sin(angle)} fontSize="10" textAnchor="middle" fill="#6b7280">{d.label}</text>
            </g>
          );
        })}
        <polygon fill="rgba(59, 130, 246, 0.3)" stroke="#3b82f6" strokeWidth="2" points={pathData.replace(/[MLZ]/g, ' ').trim()} />
      </svg>
    </div>
  );
}

export default RadarChart;
