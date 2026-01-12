import React from 'react';
import { cn } from '@/lib/utils';

interface DetectionBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  confidence?: number;
  type?: 'person' | 'vehicle' | 'object' | 'face';
  className?: string;
}

const typeColors = {
  person: 'border-green-500 bg-green-500/10',
  vehicle: 'border-blue-500 bg-blue-500/10',
  object: 'border-yellow-500 bg-yellow-500/10',
  face: 'border-purple-500 bg-purple-500/10',
};

export function DetectionBox({ x, y, width, height, label, confidence, type = 'object', className }: DetectionBoxProps) {
  return (
    <div
      className={cn('absolute border-2 pointer-events-none', typeColors[type], className)}
      style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%` }}
    >
      {(label || confidence) && (
        <div className="absolute -top-5 left-0 bg-black/80 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
          {label}{confidence && ` ${(confidence * 100).toFixed(0)}%`}
        </div>
      )}
    </div>
  );
}

export default DetectionBox;
