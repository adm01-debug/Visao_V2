import React from 'react';
import { cn } from '@/lib/utils';

interface TrackedObject {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  trail?: { x: number; y: number }[];
  color?: string;
}

interface ObjectTrackingProps {
  objects: TrackedObject[];
  showTrails?: boolean;
  showIds?: boolean;
  className?: string;
}

export function ObjectTracking({ objects, showTrails = true, showIds = true, className }: ObjectTrackingProps) {
  return (
    <svg viewBox="0 0 100 100" className={cn('absolute inset-0 pointer-events-none', className)} preserveAspectRatio="none">
      {objects.map(obj => (
        <g key={obj.id}>
          {showTrails && obj.trail && obj.trail.length > 1 && (
            <polyline
              fill="none"
              stroke={obj.color || '#3b82f6'}
              strokeWidth="0.3"
              strokeDasharray="1,1"
              points={obj.trail.map(p => `${p.x},${p.y}`).join(' ')}
              opacity="0.6"
            />
          )}
          <rect
            x={obj.x}
            y={obj.y}
            width={obj.width}
            height={obj.height}
            fill="none"
            stroke={obj.color || '#3b82f6'}
            strokeWidth="0.3"
          />
          {showIds && (
            <text x={obj.x} y={obj.y - 1} fontSize="2" fill={obj.color || '#3b82f6'}>
              {obj.type} #{obj.id.slice(-4)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export default ObjectTracking;
