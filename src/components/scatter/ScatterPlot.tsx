import React from 'react';
import { cn } from '@/lib/utils';

interface Point { x: number; y: number; label?: string; color?: string; }
interface ScatterPlotProps { data: Point[]; width?: number; height?: number; className?: string; }

export function ScatterPlot({ data, width = 400, height = 300, className }: ScatterPlotProps) {
  const maxX = Math.max(...data.map(d => d.x));
  const maxY = Math.max(...data.map(d => d.y));
  const padding = 40;

  return (
    <svg width={width} height={height} className={cn('bg-card rounded-lg', className)}>
      <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#e5e7eb" />
      <line x1={padding} y1={padding} x2={padding} y2={height-padding} stroke="#e5e7eb" />
      {data.map((p, i) => (
        <circle key={i} cx={padding + (p.x/maxX)*(width-2*padding)} cy={height-padding-(p.y/maxY)*(height-2*padding)}
          r="6" fill={p.color || '#3b82f6'} opacity="0.7"><title>{p.label || `(${p.x}, ${p.y})`}</title></circle>
      ))}
    </svg>
  );
}

export default ScatterPlot;
