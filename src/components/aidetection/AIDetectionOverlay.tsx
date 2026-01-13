import React from 'react';
import { cn } from '@/lib/utils';

interface Detection { id: string; type: 'person' | 'vehicle' | 'face' | 'object'; confidence: number; bbox: { x: number; y: number; width: number; height: number }; label?: string; }
interface AIDetectionOverlayProps { detections: Detection[]; className?: string; }

const colors = { person: 'border-blue-500 text-blue-500', vehicle: 'border-purple-500 text-purple-500', face: 'border-green-500 text-green-500', object: 'border-yellow-500 text-yellow-500' };

export function AIDetectionOverlay({ detections, className }: AIDetectionOverlayProps) {
  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)}>
      {detections.map(d => (
        <div key={d.id} className={cn('absolute border-2', colors[d.type])}
          style={{ left: `${d.bbox.x}%`, top: `${d.bbox.y}%`, width: `${d.bbox.width}%`, height: `${d.bbox.height}%` }}>
          <span className={cn('absolute -top-5 left-0 text-xs px-1 bg-black/70', colors[d.type])}>
            {d.label || d.type} {(d.confidence * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default AIDetectionOverlay;
