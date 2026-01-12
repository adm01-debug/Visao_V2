import React from 'react';
import { cn } from '@/lib/utils';

interface Zone {
  id: string;
  name: string;
  points: { x: number; y: number }[];
  color?: string;
  active?: boolean;
}

interface ZoneMapProps {
  zones: Zone[];
  width?: number;
  height?: number;
  onZoneClick?: (zone: Zone) => void;
  className?: string;
}

export function ZoneMap({ zones, width = 800, height = 600, onZoneClick, className }: ZoneMapProps) {
  const pointsToPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    const scaled = points.map(p => ({ x: (p.x / 100) * width, y: (p.y / 100) * height }));
    return `M ${scaled[0].x} ${scaled[0].y} ` + scaled.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('w-full h-auto', className)}>
      {zones.map(zone => (
        <path
          key={zone.id}
          d={pointsToPath(zone.points)}
          fill={zone.color || 'rgba(59, 130, 246, 0.3)'}
          stroke={zone.active ? '#ef4444' : '#3b82f6'}
          strokeWidth={zone.active ? 3 : 2}
          onClick={() => onZoneClick?.(zone)}
          className="cursor-pointer hover:fill-blue-500/40 transition-colors"
        >
          <title>{zone.name}</title>
        </path>
      ))}
    </svg>
  );
}

export default ZoneMap;
