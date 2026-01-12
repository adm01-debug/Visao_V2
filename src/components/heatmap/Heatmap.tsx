import React from 'react';
import { cn } from '@/lib/utils';

interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
}

interface HeatmapProps {
  points: HeatmapPoint[];
  width?: number;
  height?: number;
  maxValue?: number;
  className?: string;
}

export function Heatmap({ points, width = 800, height = 600, maxValue, className }: HeatmapProps) {
  const max = maxValue || Math.max(...points.map(p => p.value), 1);
  const radius = 30;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('w-full h-auto', className)}>
      <defs>
        <radialGradient id="heatGradient">
          <stop offset="0%" stopColor="rgba(255,0,0,0.8)" />
          <stop offset="50%" stopColor="rgba(255,255,0,0.5)" />
          <stop offset="100%" stopColor="rgba(0,255,0,0)" />
        </radialGradient>
      </defs>
      {points.map((p, i) => (
        <circle key={i}
          cx={(p.x / 100) * width}
          cy={(p.y / 100) * height}
          r={radius * (p.value / max)}
          fill="url(#heatGradient)"
          opacity={0.6 + 0.4 * (p.value / max)} />
      ))}
    </svg>
  );
}

export default Heatmap;
